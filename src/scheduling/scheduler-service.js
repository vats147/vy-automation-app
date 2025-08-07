const cron = require('node-cron');
const EventEmitter = require('events');

class SchedulerService extends EventEmitter {
    constructor(databaseManager, workflowExecutor) {
        super();
        this.databaseManager = databaseManager;
        this.workflowExecutor = workflowExecutor;
        this.scheduledTasks = new Map(); // cronTask instances
        this.activeSchedules = new Map(); // schedule metadata
        this.isInitialized = false;
        
        // Bind execution events
        this.workflowExecutor.on('executionStarted', this.handleExecutionStarted.bind(this));
        this.workflowExecutor.on('executionCompleted', this.handleExecutionCompleted.bind(this));
        this.workflowExecutor.on('executionFailed', this.handleExecutionFailed.bind(this));
    }

    async initialize() {
        try {
            console.log('🕐 Initializing scheduler service...');
            
            // Load existing schedules from database
            await this.loadSchedulesFromDatabase();
            
            this.isInitialized = true;
            console.log(`✅ Scheduler initialized with ${this.activeSchedules.size} active schedules`);
            
        } catch (error) {
            console.error('❌ Scheduler initialization failed:', error);
            throw error;
        }
    }

    async loadSchedulesFromDatabase() {
        try {
            // For now, start with empty schedules until MongoDB methods are fully implemented
            const schedules = []; // await this.getAllSchedulesFromDB();
            
            for (const schedule of schedules) {
                if (schedule.is_active) {
                    await this.startSchedule(schedule, false); // Don't save to DB, already exists
                }
            }
            
            console.log(`📅 Loaded ${schedules.length} schedules (${this.activeSchedules.size} active)`);
            
        } catch (error) {
            console.error('Failed to load schedules:', error);
            // Don't throw error, just continue with empty schedules
            console.warn('⚠️ Starting with empty schedules due to database issue');
        }
    }

    async createSchedule(scheduleData) {
        try {
            const {
                workflowId,
                name,
                cronExpression,
                timezone = 'UTC',
                isActive = true,
                endDate = null,
                maxRuns = null,
                retryPolicy = {},
                notificationSettings = {},
                metadata = {}
            } = scheduleData;

            // Validate cron expression
            if (!cron.validate(cronExpression)) {
                throw new Error(`Invalid cron expression: ${cronExpression}`);
            }

            // Validate workflow exists
            const workflow = await this.databaseManager.getWorkflowById(workflowId);
            if (!workflow) {
                throw new Error(`Workflow ${workflowId} not found`);
            }

            // Calculate next run time
            const nextRun = this.calculateNextRun(cronExpression, timezone);

            // Create schedule in database
            const scheduleId = await this.databaseManager.createSchedule({
                workflowId,
                name,
                cronExpression,
                timezone,
                isActive,
                nextRun,
                endDate,
                maxRuns,
                metadata,
                retryPolicy,
                notificationSettings
            });
            
            // Start the schedule if active
            if (isActive) {
                const schedule = await this.getScheduleById(scheduleId);
                await this.startSchedule(schedule, false);
            }

            console.log(`✅ Schedule created: ${name} (ID: ${scheduleId})`);
            
            this.emit('scheduleCreated', { scheduleId, name, workflowId });

            return scheduleId;

        } catch (error) {
            console.error('Failed to create schedule:', error);
            throw error;
        }
    }

    async updateSchedule(scheduleId, updateData) {
        try {
            const existingSchedule = await this.getScheduleById(scheduleId);
            if (!existingSchedule) {
                throw new Error(`Schedule ${scheduleId} not found`);
            }

            // Stop existing schedule if it's running
            if (this.scheduledTasks.has(scheduleId)) {
                this.stopSchedule(scheduleId, false);
            }

            const updates = [];
            const values = [];

            // Handle various update fields
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    switch (key) {
                        case 'cronExpression':
                            if (!cron.validate(value)) {
                                throw new Error(`Invalid cron expression: ${value}`);
                            }
                            updates.push('cron_expression = ?');
                            values.push(value);
                            // Recalculate next run
                            const nextRun = this.calculateNextRun(value, existingSchedule.timezone);
                            updates.push('next_run = ?');
                            values.push(nextRun);
                            break;
                        case 'isActive':
                            updates.push('is_active = ?');
                            values.push(value);
                            break;
                        case 'endDate':
                            updates.push('end_date = ?');
                            values.push(value);
                            break;
                        case 'maxRuns':
                            updates.push('max_runs = ?');
                            values.push(value);
                            break;
                        case 'retryPolicy':
                        case 'notificationSettings':
                        case 'metadata':
                            const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                            updates.push(`${columnName} = ?`);
                            values.push(JSON.stringify(value));
                            break;
                        default:
                            const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                            updates.push(`${column} = ?`);
                            values.push(value);
                    }
                }
            });

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(scheduleId);

            await this.databaseManager.run(`
                UPDATE scheduled_workflows 
                SET ${updates.join(', ')} 
                WHERE id = ?
            `, values);

            // Reload and restart schedule if active
            const updatedSchedule = await this.getScheduleById(scheduleId);
            if (updatedSchedule.is_active) {
                await this.startSchedule(updatedSchedule, false);
            }

            console.log(`✅ Schedule updated: ${scheduleId}`);
            
            this.emit('scheduleUpdated', { scheduleId, updateData });

            return updatedSchedule;

        } catch (error) {
            console.error('Failed to update schedule:', error);
            throw error;
        }
    }

    async deleteSchedule(scheduleId) {
        try {
            // Stop the schedule if it's running
            this.stopSchedule(scheduleId, false);

            // Delete from database
            const result = await this.databaseManager.run(
                'DELETE FROM scheduled_workflows WHERE id = ?',
                [scheduleId]
            );

            if (result.changes === 0) {
                throw new Error(`Schedule ${scheduleId} not found`);
            }

            console.log(`✅ Schedule deleted: ${scheduleId}`);
            
            this.emit('scheduleDeleted', { scheduleId });

            return true;

        } catch (error) {
            console.error('Failed to delete schedule:', error);
            throw error;
        }
    }

    async toggleSchedule(scheduleId, isActive) {
        try {
            const schedule = await this.getScheduleById(scheduleId);
            if (!schedule) {
                throw new Error(`Schedule ${scheduleId} not found`);
            }

            if (isActive) {
                await this.startSchedule(schedule, true);
            } else {
                this.stopSchedule(scheduleId, true);
            }

            // Update database
            await this.databaseManager.run(
                'UPDATE scheduled_workflows SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [isActive, scheduleId]
            );

            console.log(`✅ Schedule ${isActive ? 'activated' : 'deactivated'}: ${scheduleId}`);
            
            this.emit('scheduleToggled', { scheduleId, isActive });

            return true;

        } catch (error) {
            console.error('Failed to toggle schedule:', error);
            throw error;
        }
    }

    async startSchedule(schedule, updateDb = true) {
        try {
            const scheduleId = schedule.id;
            
            // Stop existing task if running
            if (this.scheduledTasks.has(scheduleId)) {
                this.stopSchedule(scheduleId, false);
            }

            // Validate schedule
            if (!this.isScheduleValid(schedule)) {
                console.warn(`⚠️ Skipping invalid schedule: ${scheduleId}`);
                return false;
            }

            // Create cron task
            const task = cron.schedule(schedule.cron_expression, async () => {
                await this.executeScheduledWorkflow(schedule);
            }, {
                scheduled: false,
                timezone: schedule.timezone
            });

            // Start the task
            task.start();

            // Store references
            this.scheduledTasks.set(scheduleId, task);
            this.activeSchedules.set(scheduleId, {
                ...schedule,
                startedAt: Date.now()
            });

            // Update database if requested
            if (updateDb) {
                await this.databaseManager.run(
                    'UPDATE scheduled_workflows SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [true, scheduleId]
                );
            }

            console.log(`▶️ Started schedule: ${schedule.name} (${schedule.cron_expression})`);
            
            this.emit('scheduleStarted', { scheduleId, name: schedule.name });

            return true;

        } catch (error) {
            console.error(`Failed to start schedule ${schedule.id}:`, error);
            throw error;
        }
    }

    stopSchedule(scheduleId, updateDb = true) {
        try {
            const task = this.scheduledTasks.get(scheduleId);
            if (task) {
                task.stop();
                task.destroy();
                this.scheduledTasks.delete(scheduleId);
            }

            const schedule = this.activeSchedules.get(scheduleId);
            this.activeSchedules.delete(scheduleId);

            // Update database if requested
            if (updateDb) {
                this.databaseManager.run(
                    'UPDATE scheduled_workflows SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [false, scheduleId]
                ).catch(error => {
                    console.error('Failed to update schedule status in database:', error);
                });
            }

            console.log(`⏹️ Stopped schedule: ${scheduleId}`);
            
            this.emit('scheduleStopped', { scheduleId, name: schedule?.name });

            return true;

        } catch (error) {
            console.error(`Failed to stop schedule ${scheduleId}:`, error);
            return false;
        }
    }

    async executeScheduledWorkflow(schedule) {
        try {
            console.log(`🚀 Executing scheduled workflow: ${schedule.name}`);
            
            // Check for overrides
            const override = await this.checkForOverride(schedule.id);
            if (override) {
                return await this.handleScheduleOverride(schedule, override);
            }

            // Check if schedule has reached max runs
            if (schedule.max_runs && schedule.run_count >= schedule.max_runs) {
                console.log(`⏸️ Schedule reached max runs: ${schedule.name}`);
                await this.toggleSchedule(schedule.id, false);
                return;
            }

            // Check if schedule has passed end date
            if (schedule.end_date && new Date() > new Date(schedule.end_date)) {
                console.log(`⏸️ Schedule past end date: ${schedule.name}`);
                await this.toggleSchedule(schedule.id, false);
                return;
            }

            // Emit schedule triggered event
            this.emit('scheduleTriggered', {
                scheduleId: schedule.id,
                workflowId: schedule.workflow_id,
                scheduleName: schedule.name
            });

            // Execute the workflow
            const executionResult = await this.workflowExecutor.executeWorkflow(
                schedule.workflow_id,
                {
                    scheduledWorkflowId: schedule.id,
                    triggerType: 'scheduled',
                    triggerMetadata: {
                        scheduleName: schedule.name,
                        cronExpression: schedule.cron_expression,
                        timezone: schedule.timezone
                    }
                }
            );

            // Update schedule statistics
            await this.updateScheduleStats(schedule.id, true);

            console.log(`✅ Scheduled workflow completed: ${schedule.name}`);

        } catch (error) {
            console.error(`❌ Scheduled workflow failed: ${schedule.name}:`, error);
            
            // Handle retry policy
            await this.handleExecutionFailure(schedule, error);
            
            // Update schedule statistics
            await this.updateScheduleStats(schedule.id, false);
            
            this.emit('scheduleError', {
                scheduleId: schedule.id,
                workflowId: schedule.workflow_id,
                error: error.message
            });
        }
    }

    async checkForOverride(scheduleId) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const override = await this.databaseManager.get(`
            SELECT * FROM workflow_overrides 
            WHERE scheduled_workflow_id = ? AND override_date = ?
        `, [scheduleId, today]);

        return override;
    }

    async handleScheduleOverride(schedule, override) {
        console.log(`🔄 Handling schedule override: ${override.action} for ${schedule.name}`);
        
        switch (override.action) {
            case 'skip':
                console.log(`⏭️ Skipping scheduled execution: ${schedule.name}`);
                this.emit('scheduleSkipped', {
                    scheduleId: schedule.id,
                    reason: override.reason
                });
                break;
                
            case 'run_once':
                // Execute once and then disable
                await this.workflowExecutor.executeWorkflow(schedule.workflow_id, {
                    scheduledWorkflowId: schedule.id,
                    triggerType: 'scheduled_override',
                    triggerMetadata: { override }
                });
                await this.toggleSchedule(schedule.id, false);
                break;
                
            case 'run_different':
                if (override.alternative_workflow_id) {
                    await this.workflowExecutor.executeWorkflow(override.alternative_workflow_id, {
                        scheduledWorkflowId: schedule.id,
                        triggerType: 'scheduled_override',
                        triggerMetadata: { override, originalWorkflowId: schedule.workflow_id }
                    });
                }
                break;
        }
    }

    async handleExecutionFailure(schedule, error) {
        const retryPolicy = schedule.retry_policy ? JSON.parse(schedule.retry_policy) : {};
        
        if (retryPolicy.enabled && retryPolicy.maxRetries > 0) {
            // Implement retry logic here
            console.log(`🔄 Retry policy not yet implemented for schedule: ${schedule.id}`);
        }
        
        // Send notifications if configured
        const notificationSettings = schedule.notification_settings ? 
            JSON.parse(schedule.notification_settings) : {};
            
        if (notificationSettings.onFailure) {
            // Implement notification sending here
            console.log(`📧 Notification not yet implemented for schedule: ${schedule.id}`);
        }
    }

    async updateScheduleStats(scheduleId, success) {
        try {
            const updates = [
                'run_count = run_count + 1',
                'last_run = CURRENT_TIMESTAMP'
            ];

            // Calculate next run
            const schedule = await this.getScheduleById(scheduleId);
            if (schedule) {
                const nextRun = this.calculateNextRun(schedule.cron_expression, schedule.timezone);
                updates.push('next_run = ?');
                
                await this.databaseManager.run(`
                    UPDATE scheduled_workflows 
                    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [nextRun, scheduleId]);
            }

        } catch (error) {
            console.error('Failed to update schedule stats:', error);
        }
    }

    calculateNextRun(cronExpression, timezone = 'UTC') {
        try {
            // Note: This is a simplified implementation
            // In a production system, you'd use a proper cron parser
            const now = new Date();
            const nextRun = new Date(now.getTime() + 60000); // Add 1 minute as placeholder
            return nextRun.toISOString();
        } catch (error) {
            console.error('Failed to calculate next run:', error);
            return null;
        }
    }

    isScheduleValid(schedule) {
        if (!schedule.cron_expression || !cron.validate(schedule.cron_expression)) {
            return false;
        }
        
        if (schedule.end_date && new Date() > new Date(schedule.end_date)) {
            return false;
        }
        
        if (schedule.max_runs && schedule.run_count >= schedule.max_runs) {
            return false;
        }
        
        return true;
    }

    // Event handlers for workflow execution
    handleExecutionStarted(data) {
        if (data.scheduledWorkflowId) {
            this.emit('scheduledExecutionStarted', data);
        }
    }

    handleExecutionCompleted(data) {
        if (data.scheduledWorkflowId) {
            this.emit('scheduledExecutionCompleted', data);
        }
    }

    handleExecutionFailed(data) {
        if (data.scheduledWorkflowId) {
            this.emit('scheduledExecutionFailed', data);
        }
    }

    // Database access methods
    async getAllSchedules() {
        return await this.getAllSchedulesFromDB();
    }

    async getAllSchedulesFromDB() {
        const schedules = await this.databaseManager.getAllSchedules();
        return schedules;
    }

    async getScheduleById(scheduleId) {
        const schedule = await this.databaseManager.getScheduleById(scheduleId);
        return schedule;
    }

    parseScheduleData(schedule) {
        return {
            ...schedule,
            metadata: schedule.metadata ? JSON.parse(schedule.metadata) : {},
            retryPolicy: schedule.retry_policy ? JSON.parse(schedule.retry_policy) : {},
            notificationSettings: schedule.notification_settings ? JSON.parse(schedule.notification_settings) : {},
            isActive: Boolean(schedule.is_active)
        };
    }

    getActiveSchedulesCount() {
        return this.activeSchedules.size;
    }

    getScheduleStatus(scheduleId) {
        const isRunning = this.scheduledTasks.has(scheduleId);
        const schedule = this.activeSchedules.get(scheduleId);
        
        return {
            isRunning,
            schedule,
            nextExecution: schedule ? this.calculateNextRun(schedule.cron_expression, schedule.timezone) : null
        };
    }

    async shutdown() {
        console.log('🛑 Shutting down scheduler service...');
        
        // Stop all active schedules
        for (const [scheduleId] of this.scheduledTasks) {
            this.stopSchedule(scheduleId, false);
        }
        
        this.scheduledTasks.clear();
        this.activeSchedules.clear();
        
        console.log('✅ Scheduler service shut down');
    }
}

module.exports = SchedulerService;
