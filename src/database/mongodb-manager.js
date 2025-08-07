const { MongoClient, ObjectId } = require('mongodb');
const EventEmitter = require('events');

class MongoDBManager extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.db = null;
        this.isInitialized = false;
        
        // Default MongoDB configuration
        this.config = {
            url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
            dbName: process.env.DB_NAME || 'vy_automation',
            options: {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                family: 4, // Use IPv4, skip trying IPv6
                retryWrites: true,
                writeConcern: {
                    w: 'majority'
                }
            }
        };
        
        // Collection names
        this.collections = {
            workflows: 'workflows',
            scheduledWorkflows: 'scheduled_workflows',
            workflowExecutions: 'workflow_executions',
            workflowOverrides: 'workflow_overrides',
            workflowTemplates: 'workflow_templates',
            userSettings: 'user_settings'
        };
    }

    async initialize() {
        try {
            console.log('🔧 Initializing MongoDB connection...');
            
            // Connect to MongoDB
            await this.connect();
            
            // Create indexes for better performance
            await this.createIndexes();
            
            // Verify collections exist
            await this.ensureCollections();
            
            this.isInitialized = true;
            console.log('✅ MongoDB initialized successfully');
            
            this.emit('connected');
            
        } catch (error) {
            console.error('❌ MongoDB initialization failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async connect() {
        try {
            console.log(`🔗 Connecting to MongoDB at ${this.config.url}...`);
            
            this.client = new MongoClient(this.config.url, this.config.options);
            await this.client.connect();
            
            this.db = this.client.db(this.config.dbName);
            
            // Test the connection
            await this.db.admin().ping();
            console.log('✅ MongoDB connection established');
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('MongoDB server is not running. Please start MongoDB locally or check connection settings.');
            }
            throw error;
        }
    }

    async ensureCollections() {
        try {
            const existingCollections = await this.db.listCollections().toArray();
            const existingNames = existingCollections.map(col => col.name);
            
            for (const [key, collectionName] of Object.entries(this.collections)) {
                if (!existingNames.includes(collectionName)) {
                    await this.db.createCollection(collectionName);
                    console.log(`📦 Created collection: ${collectionName}`);
                }
            }
        } catch (error) {
            console.error('Failed to ensure collections:', error);
            throw error;
        }
    }

    async createIndexes() {
        try {
            console.log('📊 Creating database indexes...');
            
            // Workflows collection indexes
            await this.db.collection(this.collections.workflows).createIndexes([
                { key: { status: 1 } },
                { key: { type: 1 } },
                { key: { createdAt: -1 } },
                { key: { category: 1 } },
                { key: { tags: 1 } },
                { key: { name: 'text', description: 'text' } }, // Text search
                { key: { isTemplate: 1 } }
            ]);

            // Scheduled workflows collection indexes
            await this.db.collection(this.collections.scheduledWorkflows).createIndexes([
                { key: { workflowId: 1 } },
                { key: { isActive: 1 } },
                { key: { nextRun: 1 } },
                { key: { lastRun: -1 } }
            ]);

            // Workflow executions collection indexes
            await this.db.collection(this.collections.workflowExecutions).createIndexes([
                { key: { workflowId: 1 } },
                { key: { scheduledWorkflowId: 1 } },
                { key: { status: 1 } },
                { key: { startedAt: -1 } },
                { key: { triggerType: 1 } },
                { key: { completedAt: -1 } }
            ]);

            // Workflow overrides collection indexes
            await this.db.collection(this.collections.workflowOverrides).createIndexes([
                { key: { scheduledWorkflowId: 1 } },
                { key: { overrideDate: 1 } },
                { key: { scheduledWorkflowId: 1, overrideDate: 1 }, unique: true }
            ]);

            // Workflow templates collection indexes
            await this.db.collection(this.collections.workflowTemplates).createIndexes([
                { key: { category: 1 } },
                { key: { isPublic: 1 } },
                { key: { tags: 1 } },
                { key: { usageCount: -1 } },
                { key: { rating: -1 } },
                { key: { name: 'text', description: 'text' } }
            ]);

            console.log('✅ Database indexes created');
            
        } catch (error) {
            console.error('Failed to create indexes:', error);
            // Don't throw here, indexes are not critical for basic functionality
        }
    }

    // Workflow operations
    async createWorkflow(workflowData) {
        try {
            const workflow = {
                name: workflowData.name,
                description: workflowData.description || '',
                type: workflowData.type || 'recorded',
                status: workflowData.status || 'draft',
                steps: workflowData.steps || [],
                metadata: workflowData.metadata || {},
                tags: workflowData.tags || [],
                category: workflowData.category || 'general',
                isTemplate: workflowData.isTemplate || false,
                audioFilePath: workflowData.audioFilePath || null,
                screenshotPaths: workflowData.screenshotPaths || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: workflowData.createdBy || 'user',
                version: 1
            };

            const result = await this.db.collection(this.collections.workflows).insertOne(workflow);
            
            const createdWorkflow = await this.getWorkflowById(result.insertedId);
            
            console.log(`✅ Workflow created: ${workflow.name} (ID: ${result.insertedId})`);
            this.emit('workflowCreated', createdWorkflow);
            
            return createdWorkflow;
            
        } catch (error) {
            console.error('Failed to create workflow:', error);
            throw error;
        }
    }

    async updateWorkflow(id, updateData) {
        try {
            const objectId = new ObjectId(id);
            
            // Prepare update data
            const updateFields = { ...updateData };
            updateFields.updatedAt = new Date();
            
            // Remove undefined values
            Object.keys(updateFields).forEach(key => {
                if (updateFields[key] === undefined) {
                    delete updateFields[key];
                }
            });

            const result = await this.db.collection(this.collections.workflows).updateOne(
                { _id: objectId },
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                throw new Error(`Workflow ${id} not found`);
            }

            const updatedWorkflow = await this.getWorkflowById(id);
            
            console.log(`✅ Workflow updated: ${id}`);
            this.emit('workflowUpdated', updatedWorkflow);
            
            return updatedWorkflow;
            
        } catch (error) {
            console.error('Failed to update workflow:', error);
            throw error;
        }
    }

    async deleteWorkflow(id) {
        try {
            const objectId = new ObjectId(id);
            
            // Also delete related scheduled workflows and executions
            await Promise.all([
                this.db.collection(this.collections.scheduledWorkflows).deleteMany({ workflowId: id }),
                this.db.collection(this.collections.workflowExecutions).deleteMany({ workflowId: id })
            ]);
            
            const result = await this.db.collection(this.collections.workflows).deleteOne({ _id: objectId });
            
            if (result.deletedCount === 0) {
                throw new Error(`Workflow ${id} not found`);
            }
            
            console.log(`✅ Workflow deleted: ${id}`);
            this.emit('workflowDeleted', { id });
            
            return true;
            
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            throw error;
        }
    }

    async getWorkflowById(id) {
        try {
            const objectId = new ObjectId(id);
            const workflow = await this.db.collection(this.collections.workflows).findOne({ _id: objectId });
            
            if (!workflow) {
                return null;
            }
            
            return this.parseWorkflowData(workflow);
            
        } catch (error) {
            console.error('Failed to get workflow:', error);
            throw error;
        }
    }

    async getAllWorkflows(filters = {}) {
        try {
            const query = {};
            const options = { sort: { updatedAt: -1 } };
            
            // Apply filters
            if (filters.status) {
                query.status = filters.status;
            }
            
            if (filters.type) {
                query.type = filters.type;
            }
            
            if (filters.category) {
                query.category = filters.category;
            }
            
            if (filters.isTemplate !== undefined) {
                query.isTemplate = filters.isTemplate;
            }
            
            if (filters.search) {
                query.$text = { $search: filters.search };
            }
            
            if (filters.tags && filters.tags.length > 0) {
                query.tags = { $in: filters.tags };
            }
            
            if (filters.limit) {
                options.limit = parseInt(filters.limit);
            }
            
            const workflows = await this.db.collection(this.collections.workflows)
                .find(query, options)
                .toArray();
            
            return workflows.map(workflow => this.parseWorkflowData(workflow));
            
        } catch (error) {
            console.error('Failed to get workflows:', error);
            throw error;
        }
    }

    parseWorkflowData(workflow) {
        return {
            ...workflow,
            id: workflow._id.toString(),
            _id: undefined // Remove the ObjectId from the response
        };
    }

    // Execution operations
    async createExecution(executionData) {
        try {
            const execution = {
                workflowId: executionData.workflowId,
                scheduledWorkflowId: executionData.scheduledWorkflowId || null,
                status: 'running',
                startedAt: new Date(),
                completedAt: null,
                durationMs: null,
                stepsCompleted: 0,
                totalSteps: executionData.totalSteps || 0,
                currentStep: null,
                errorMessage: null,
                errorStack: null,
                executionLog: [],
                metadata: executionData.metadata || {},
                triggerType: executionData.triggerType || 'manual',
                triggerMetadata: executionData.triggerMetadata || {}
            };

            const result = await this.db.collection(this.collections.workflowExecutions).insertOne(execution);
            
            console.log(`✅ Execution created: ${result.insertedId}`);
            
            return result.insertedId.toString();
            
        } catch (error) {
            console.error('Failed to create execution:', error);
            throw error;
        }
    }

    async updateExecution(id, updateData) {
        try {
            const objectId = new ObjectId(id);
            
            const updateFields = { ...updateData };
            
            // Handle completion
            if (updateFields.status === 'completed' && !updateFields.completedAt) {
                updateFields.completedAt = new Date();
            }
            
            // Calculate duration if completed
            if (updateFields.completedAt && updateFields.startedAt) {
                updateFields.durationMs = updateFields.completedAt - updateFields.startedAt;
            }

            const result = await this.db.collection(this.collections.workflowExecutions).updateOne(
                { _id: objectId },
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                throw new Error(`Execution ${id} not found`);
            }
            
            return true;
            
        } catch (error) {
            console.error('Failed to update execution:', error);
            throw error;
        }
    }

    async getExecutionHistory(filters = {}) {
        try {
            const pipeline = [
                {
                    $lookup: {
                        from: this.collections.workflows,
                        localField: 'workflowId',
                        foreignField: '_id',
                        as: 'workflow'
                    }
                },
                {
                    $lookup: {
                        from: this.collections.scheduledWorkflows,
                        localField: 'scheduledWorkflowId',
                        foreignField: '_id',
                        as: 'schedule'
                    }
                },
                {
                    $addFields: {
                        workflowName: { $arrayElemAt: ['$workflow.name', 0] },
                        scheduleName: { $arrayElemAt: ['$schedule.name', 0] }
                    }
                },
                {
                    $project: {
                        workflow: 0,
                        schedule: 0
                    }
                }
            ];
            
            // Apply filters
            const matchStage = {};
            
            if (filters.workflowId) {
                matchStage.workflowId = filters.workflowId;
            }
            
            if (filters.status) {
                matchStage.status = filters.status;
            }
            
            if (filters.triggerType) {
                matchStage.triggerType = filters.triggerType;
            }
            
            if (filters.startDate) {
                matchStage.startedAt = { $gte: new Date(filters.startDate) };
            }
            
            if (filters.endDate) {
                if (matchStage.startedAt) {
                    matchStage.startedAt.$lte = new Date(filters.endDate);
                } else {
                    matchStage.startedAt = { $lte: new Date(filters.endDate) };
                }
            }
            
            if (Object.keys(matchStage).length > 0) {
                pipeline.unshift({ $match: matchStage });
            }
            
            // Add sorting and limit
            pipeline.push({ $sort: { startedAt: -1 } });
            
            if (filters.limit) {
                pipeline.push({ $limit: parseInt(filters.limit) });
            }
            
            const executions = await this.db.collection(this.collections.workflowExecutions)
                .aggregate(pipeline)
                .toArray();
            
            return executions.map(execution => this.parseExecutionData(execution));
            
        } catch (error) {
            console.error('Failed to get execution history:', error);
            throw error;
        }
    }

    async getExecutionDetails(executionId) {
        try {
            const objectId = new ObjectId(executionId);
            
            const pipeline = [
                { $match: { _id: objectId } },
                {
                    $lookup: {
                        from: this.collections.workflows,
                        localField: 'workflowId',
                        foreignField: '_id',
                        as: 'workflow'
                    }
                },
                {
                    $lookup: {
                        from: this.collections.scheduledWorkflows,
                        localField: 'scheduledWorkflowId',
                        foreignField: '_id',
                        as: 'schedule'
                    }
                },
                {
                    $addFields: {
                        workflowName: { $arrayElemAt: ['$workflow.name', 0] },
                        workflowSteps: { $arrayElemAt: ['$workflow.steps', 0] },
                        scheduleName: { $arrayElemAt: ['$schedule.name', 0] }
                    }
                },
                {
                    $project: {
                        workflow: 0,
                        schedule: 0
                    }
                }
            ];
            
            const result = await this.db.collection(this.collections.workflowExecutions)
                .aggregate(pipeline)
                .toArray();
            
            if (result.length === 0) {
                return null;
            }
            
            return this.parseExecutionData(result[0]);
            
        } catch (error) {
            console.error('Failed to get execution details:', error);
            throw error;
        }
    }

    parseExecutionData(execution) {
        return {
            ...execution,
            id: execution._id.toString(),
            _id: undefined
        };
    }

    // Scheduling operations
    async createSchedule(scheduleData) {
        try {
            const schedule = {
                workflowId: scheduleData.workflowId,
                name: scheduleData.name,
                cronExpression: scheduleData.cronExpression,
                timezone: scheduleData.timezone || 'UTC',
                isActive: scheduleData.isActive !== false,
                nextRun: scheduleData.nextRun ? new Date(scheduleData.nextRun) : null,
                lastRun: null,
                runCount: 0,
                maxRuns: scheduleData.maxRuns || null,
                endDate: scheduleData.endDate ? new Date(scheduleData.endDate) : null,
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: scheduleData.metadata || {},
                retryPolicy: scheduleData.retryPolicy || {},
                notificationSettings: scheduleData.notificationSettings || {}
            };

            const result = await this.db.collection(this.collections.scheduledWorkflows).insertOne(schedule);
            
            console.log(`✅ Schedule created: ${schedule.name} (ID: ${result.insertedId})`);
            
            return result.insertedId.toString();
            
        } catch (error) {
            console.error('Failed to create schedule:', error);
            throw error;
        }
    }

    async updateSchedule(id, updateData) {
        try {
            const objectId = new ObjectId(id);
            
            const updateFields = { ...updateData };
            updateFields.updatedAt = new Date();
            
            const result = await this.db.collection(this.collections.scheduledWorkflows).updateOne(
                { _id: objectId },
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                throw new Error(`Schedule ${id} not found`);
            }
            
            return true;
            
        } catch (error) {
            console.error('Failed to update schedule:', error);
            throw error;
        }
    }

    async deleteSchedule(id) {
        try {
            const objectId = new ObjectId(id);
            
            const result = await this.db.collection(this.collections.scheduledWorkflows).deleteOne({ _id: objectId });
            
            if (result.deletedCount === 0) {
                throw new Error(`Schedule ${id} not found`);
            }
            
            return true;
            
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            throw error;
        }
    }

    async getAllSchedules() {
        try {
            const pipeline = [
                {
                    $lookup: {
                        from: this.collections.workflows,
                        localField: 'workflowId',
                        foreignField: '_id',
                        as: 'workflow'
                    }
                },
                {
                    $addFields: {
                        workflowName: { $arrayElemAt: ['$workflow.name', 0] },
                        workflowStatus: { $arrayElemAt: ['$workflow.status', 0] }
                    }
                },
                {
                    $project: {
                        workflow: 0
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ];
            
            const schedules = await this.db.collection(this.collections.scheduledWorkflows)
                .aggregate(pipeline)
                .toArray();
            
            return schedules.map(schedule => this.parseScheduleData(schedule));
            
        } catch (error) {
            console.error('Failed to get schedules:', error);
            throw error;
        }
    }

    async getScheduleById(id) {
        try {
            const objectId = new ObjectId(id);
            const schedule = await this.db.collection(this.collections.scheduledWorkflows).findOne({ _id: objectId });
            
            if (!schedule) {
                return null;
            }
            
            return this.parseScheduleData(schedule);
            
        } catch (error) {
            console.error('Failed to get schedule:', error);
            throw error;
        }
    }

    parseScheduleData(schedule) {
        return {
            ...schedule,
            id: schedule._id.toString(),
            _id: undefined
        };
    }

    // Connection management
    async close() {
        try {
            if (this.client) {
                await this.client.close();
                console.log('✅ MongoDB connection closed');
                this.emit('disconnected');
            }
        } catch (error) {
            console.error('Error closing MongoDB connection:', error);
        }
    }

    // Health check
    async ping() {
        try {
            await this.db.admin().ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    // Database statistics
    async getStats() {
        try {
            const stats = await this.db.stats();
            const collections = {};
            
            for (const [key, collectionName] of Object.entries(this.collections)) {
                const count = await this.db.collection(collectionName).countDocuments();
                collections[key] = count;
            }
            
            return {
                dbName: this.config.dbName,
                collections,
                dbStats: {
                    dataSize: stats.dataSize,
                    storageSize: stats.storageSize,
                    indexSize: stats.indexSize,
                    objects: stats.objects
                }
            };
            
        } catch (error) {
            console.error('Failed to get database stats:', error);
            return null;
        }
    }
}

module.exports = MongoDBManager;
