const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/workflows.db');
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Ensure data directory exists
            await this.ensureDataDirectory();
            
            // Open database connection
            await this.connect();
            
            // Run migrations
            await this.runMigrations();
            
            this.isInitialized = true;
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async ensureDataDirectory() {
        const dataDir = path.dirname(this.dbPath);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON;', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async runMigrations() {
        // Create migrations table if it doesn't exist
        await this.run(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create core tables
        await this.createTables();
        
        console.log('Database migrations completed');
    }

    async createTables() {
        // Workflows table
        await this.run(`
            CREATE TABLE IF NOT EXISTS workflows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL DEFAULT 'recorded', -- 'recorded', 'manual', 'imported'
                status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'
                steps TEXT NOT NULL, -- JSON array of workflow steps
                metadata TEXT, -- JSON object for additional data
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT DEFAULT 'user',
                tags TEXT, -- JSON array of tags
                category TEXT,
                version INTEGER DEFAULT 1,
                is_template BOOLEAN DEFAULT FALSE,
                audio_file_path TEXT,
                screenshot_paths TEXT -- JSON array of screenshot file paths
            )
        `);

        // Scheduled workflows table
        await this.run(`
            CREATE TABLE IF NOT EXISTS scheduled_workflows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workflow_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                cron_expression TEXT NOT NULL,
                timezone TEXT DEFAULT 'UTC',
                is_active BOOLEAN DEFAULT TRUE,
                next_run DATETIME,
                last_run DATETIME,
                run_count INTEGER DEFAULT 0,
                max_runs INTEGER, -- NULL for unlimited
                end_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT, -- JSON object for schedule-specific settings
                retry_policy TEXT, -- JSON object for retry configuration
                notification_settings TEXT, -- JSON object for notification preferences
                FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE
            )
        `);

        // Workflow executions table
        await this.run(`
            CREATE TABLE IF NOT EXISTS workflow_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workflow_id INTEGER NOT NULL,
                scheduled_workflow_id INTEGER, -- NULL for manual executions
                status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                duration_ms INTEGER,
                steps_completed INTEGER DEFAULT 0,
                total_steps INTEGER,
                current_step TEXT, -- JSON object of current step being executed
                error_message TEXT,
                error_stack TEXT,
                execution_log TEXT, -- JSON array of execution logs
                metadata TEXT, -- JSON object for execution-specific data
                trigger_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled', 'api'
                trigger_metadata TEXT, -- JSON object for trigger-specific data
                FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE,
                FOREIGN KEY (scheduled_workflow_id) REFERENCES scheduled_workflows (id) ON DELETE SET NULL
            )
        `);

        // Workflow execution overrides table
        await this.run(`
            CREATE TABLE IF NOT EXISTS workflow_overrides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scheduled_workflow_id INTEGER NOT NULL,
                override_date DATE NOT NULL,
                action TEXT NOT NULL DEFAULT 'skip', -- 'skip', 'run_once', 'run_different'
                alternative_workflow_id INTEGER,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT DEFAULT 'user',
                FOREIGN KEY (scheduled_workflow_id) REFERENCES scheduled_workflows (id) ON DELETE CASCADE,
                FOREIGN KEY (alternative_workflow_id) REFERENCES workflows (id) ON DELETE SET NULL,
                UNIQUE(scheduled_workflow_id, override_date)
            )
        `);

        // Workflow templates table
        await this.run(`
            CREATE TABLE IF NOT EXISTS workflow_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                template_data TEXT NOT NULL, -- JSON object with workflow template
                preview_image TEXT, -- Path to preview image
                usage_count INTEGER DEFAULT 0,
                rating REAL DEFAULT 0.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_public BOOLEAN DEFAULT FALSE,
                tags TEXT -- JSON array of tags
            )
        `);

        // Create indexes for better performance
        await this.createIndexes();
    }

    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows (status)',
            'CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows (type)',
            'CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows (created_at)',
            'CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows (category)',
            
            'CREATE INDEX IF NOT EXISTS idx_scheduled_workflows_workflow_id ON scheduled_workflows (workflow_id)',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_workflows_is_active ON scheduled_workflows (is_active)',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_workflows_next_run ON scheduled_workflows (next_run)',
            
            'CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions (workflow_id)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions (status)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions (started_at)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_executions_trigger_type ON workflow_executions (trigger_type)',
            
            'CREATE INDEX IF NOT EXISTS idx_workflow_overrides_scheduled_workflow_id ON workflow_overrides (scheduled_workflow_id)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_overrides_override_date ON workflow_overrides (override_date)',
            
            'CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates (category)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_public ON workflow_templates (is_public)'
        ];

        for (const indexSql of indexes) {
            await this.run(indexSql);
        }
    }

    // Core database operations
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err, 'SQL:', sql);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err, 'SQL:', sql);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database all error:', err, 'SQL:', sql);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Workflow operations
    async createWorkflow(workflowData) {
        const {
            name,
            description = '',
            type = 'recorded',
            status = 'draft',
            steps,
            metadata = {},
            tags = [],
            category = 'general',
            isTemplate = false,
            audioFilePath = null,
            screenshotPaths = []
        } = workflowData;

        const result = await this.run(`
            INSERT INTO workflows (
                name, description, type, status, steps, metadata, 
                tags, category, is_template, audio_file_path, screenshot_paths
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            description,
            type,
            status,
            JSON.stringify(steps),
            JSON.stringify(metadata),
            JSON.stringify(tags),
            category,
            isTemplate,
            audioFilePath,
            JSON.stringify(screenshotPaths)
        ]);

        return this.getWorkflowById(result.id);
    }

    async updateWorkflow(id, workflowData) {
        const updates = [];
        const values = [];

        Object.entries(workflowData).forEach(([key, value]) => {
            if (value !== undefined) {
                if (['steps', 'metadata', 'tags', 'screenshotPaths'].includes(key)) {
                    const columnName = key === 'screenshotPaths' ? 'screenshot_paths' : 
                                     key === 'audioFilePath' ? 'audio_file_path' :
                                     key === 'isTemplate' ? 'is_template' : key;
                    updates.push(`${columnName} = ?`);
                    values.push(JSON.stringify(value));
                } else {
                    const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    updates.push(`${columnName} = ?`);
                    values.push(value);
                }
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await this.run(`
            UPDATE workflows 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `, values);

        return this.getWorkflowById(id);
    }

    async deleteWorkflow(id) {
        const result = await this.run('DELETE FROM workflows WHERE id = ?', [id]);
        return result.changes > 0;
    }

    async getWorkflowById(id) {
        const workflow = await this.get('SELECT * FROM workflows WHERE id = ?', [id]);
        if (workflow) {
            return this.parseWorkflowData(workflow);
        }
        return null;
    }

    async getAllWorkflows(filters = {}) {
        let sql = 'SELECT * FROM workflows';
        const conditions = [];
        const params = [];

        if (filters.status) {
            conditions.push('status = ?');
            params.push(filters.status);
        }

        if (filters.type) {
            conditions.push('type = ?');
            params.push(filters.type);
        }

        if (filters.category) {
            conditions.push('category = ?');
            params.push(filters.category);
        }

        if (filters.isTemplate !== undefined) {
            conditions.push('is_template = ?');
            params.push(filters.isTemplate);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY updated_at DESC';

        if (filters.limit) {
            sql += ` LIMIT ${parseInt(filters.limit)}`;
        }

        const workflows = await this.all(sql, params);
        return workflows.map(this.parseWorkflowData);
    }

    parseWorkflowData(workflow) {
        return {
            ...workflow,
            steps: JSON.parse(workflow.steps || '[]'),
            metadata: JSON.parse(workflow.metadata || '{}'),
            tags: JSON.parse(workflow.tags || '[]'),
            screenshotPaths: JSON.parse(workflow.screenshot_paths || '[]'),
            isTemplate: Boolean(workflow.is_template),
            audioFilePath: workflow.audio_file_path
        };
    }

    // Execution operations
    async createExecution(executionData) {
        const {
            workflowId,
            scheduledWorkflowId = null,
            triggerType = 'manual',
            triggerMetadata = {},
            totalSteps = 0
        } = executionData;

        const result = await this.run(`
            INSERT INTO workflow_executions (
                workflow_id, scheduled_workflow_id, trigger_type, 
                trigger_metadata, total_steps
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            workflowId,
            scheduledWorkflowId,
            triggerType,
            JSON.stringify(triggerMetadata),
            totalSteps
        ]);

        return result.id;
    }

    async updateExecution(id, updateData) {
        const updates = [];
        const values = [];

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                if (['current_step', 'execution_log', 'metadata', 'trigger_metadata'].includes(columnName)) {
                    updates.push(`${columnName} = ?`);
                    values.push(JSON.stringify(value));
                } else {
                    updates.push(`${columnName} = ?`);
                    values.push(value);
                }
            }
        });

        if (updates.length === 0) return;

        values.push(id);

        await this.run(`
            UPDATE workflow_executions 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `, values);
    }

    async getExecutionHistory(filters = {}) {
        let sql = `
            SELECT 
                we.*,
                w.name as workflow_name,
                sw.name as schedule_name
            FROM workflow_executions we
            LEFT JOIN workflows w ON we.workflow_id = w.id
            LEFT JOIN scheduled_workflows sw ON we.scheduled_workflow_id = sw.id
        `;

        const conditions = [];
        const params = [];

        if (filters.workflowId) {
            conditions.push('we.workflow_id = ?');
            params.push(filters.workflowId);
        }

        if (filters.status) {
            conditions.push('we.status = ?');
            params.push(filters.status);
        }

        if (filters.triggerType) {
            conditions.push('we.trigger_type = ?');
            params.push(filters.triggerType);
        }

        if (filters.startDate) {
            conditions.push('we.started_at >= ?');
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push('we.started_at <= ?');
            params.push(filters.endDate);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY we.started_at DESC';

        if (filters.limit) {
            sql += ` LIMIT ${parseInt(filters.limit)}`;
        }

        const executions = await this.all(sql, params);
        return executions.map(this.parseExecutionData);
    }

    async getExecutionDetails(executionId) {
        const execution = await this.get(`
            SELECT 
                we.*,
                w.name as workflow_name,
                w.steps as workflow_steps,
                sw.name as schedule_name
            FROM workflow_executions we
            LEFT JOIN workflows w ON we.workflow_id = w.id
            LEFT JOIN scheduled_workflows sw ON we.scheduled_workflow_id = sw.id
            WHERE we.id = ?
        `, [executionId]);

        if (execution) {
            return this.parseExecutionData(execution);
        }
        return null;
    }

    parseExecutionData(execution) {
        return {
            ...execution,
            currentStep: execution.current_step ? JSON.parse(execution.current_step) : null,
            executionLog: execution.execution_log ? JSON.parse(execution.execution_log) : [],
            metadata: execution.metadata ? JSON.parse(execution.metadata) : {},
            triggerMetadata: execution.trigger_metadata ? JSON.parse(execution.trigger_metadata) : {},
            workflowSteps: execution.workflow_steps ? JSON.parse(execution.workflow_steps) : []
        };
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = DatabaseManager;
