/**
 * Represents a single, complex automation task.
 * This class encapsulates all information related to a task, including its goal,
 * history of actions, and current status.
 */
class Task {
    constructor(goal) {
        if (!goal || typeof goal !== 'string') {
            throw new Error('A task must be initialized with a string goal.');
        }

        this.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.goal = goal;
        this.status = 'pending'; // pending, running, completed, failed
        this.history = []; // A list of actions taken
        this.screenshots = []; // A list of screenshot file paths
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Adds a completed action to the task's history.
     * @param {object} action - The action that was executed.
     * @param {string} screenshotPath - The path to the screenshot taken after the action.
     */
    addAction(action, screenshotPath) {
        this.history.push({
            timestamp: new Date(),
            action: action,
            screenshot: screenshotPath,
        });
        if (screenshotPath) {
            this.screenshots.push(screenshotPath);
        }
        this.touch();
    }

    /**
     * Updates the status of the task.
     * @param {string} newStatus - The new status (e.g., 'running', 'completed', 'failed').
     */
    setStatus(newStatus) {
        const allowedStatus = ['pending', 'running', 'completed', 'failed'];
        if (allowedStatus.includes(newStatus)) {
            this.status = newStatus;
            this.touch();
        } else {
            console.warn(`Attempted to set invalid status: ${newStatus}`);
        }
    }

    /**
     * Marks the task as running.
     */
    start() {
        this.setStatus('running');
    }

    /**
     * Marks the task as completed.
     */
    complete() {
        this.setStatus('completed');
    }

    /**
     * Marks the task as failed.
     * @param {string} reason - The reason for the failure.
     */
    fail(reason) {
        this.status = 'failed';
        this.failureReason = reason;
        this.touch();
    }

    /**
     * Updates the 'updatedAt' timestamp.
     */
    touch() {
        this.updatedAt = new Date();
    }

    /**
     * Returns a summary of the task.
     */
    getSummary() {
        return {
            id: this.id,
            goal: this.goal,
            status: this.status,
            history_length: this.history.length,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }
}

module.exports = Task;
