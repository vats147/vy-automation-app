const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

// Try to load audio recording libraries
let audioRecorder;
try {
    audioRecorder = require('node-record-lpcm16');
} catch (error) {
    console.warn('Audio recording library not available:', error.message);
}

class AudioRecorder extends EventEmitter {
    constructor() {
        super();
        this.isRecording = false;
        this.currentRecording = null;
        this.recordingStartTime = null;
        this.recordingFilePath = null;
        this.audioStream = null;
        this.recordingId = null;
        
        // Recording settings
        this.settings = {
            sampleRate: 16000,
            channels: 1,
            threshold: 0.5,
            silence: '2.0',
            device: null, // Use default device
            audioFormat: 'wav'
        };
        
        // Ensure audio directory exists
        this.audioDir = path.join(__dirname, '../audio');
        this.ensureAudioDirectory();
    }

    async ensureAudioDirectory() {
        try {
            await fs.access(this.audioDir);
        } catch (error) {
            await fs.mkdir(this.audioDir, { recursive: true });
        }
    }

    async startRecording(filename = null) {
        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }

        if (!audioRecorder) {
            throw new Error('Audio recording is not available on this system');
        }

        try {
            console.log('🎤 Starting audio recording...');
            
            // Generate filename if not provided
            if (!filename) {
                const timestamp = Date.now();
                filename = `recording_${timestamp}.wav`;
            }
            
            // Ensure filename has correct extension
            if (!filename.endsWith('.wav')) {
                filename += '.wav';
            }
            
            this.recordingFilePath = path.join(this.audioDir, filename);
            this.recordingStartTime = Date.now();
            this.recordingId = `audio_${this.recordingStartTime}`;
            
            // Configure recording options
            const recordingOptions = {
                sampleRate: this.settings.sampleRate,
                channels: this.settings.channels,
                threshold: this.settings.threshold,
                silence: this.settings.silence,
                verbose: false,
                recordProgram: this.getRecordingProgram()
            };
            
            if (this.settings.device) {
                recordingOptions.device = this.settings.device;
            }
            
            // Start recording
            this.audioStream = audioRecorder.record(recordingOptions);
            
            // Pipe to file
            const fileStream = require('fs').createWriteStream(this.recordingFilePath);
            this.audioStream.stream().pipe(fileStream);
            
            // Handle recording events
            this.audioStream.stream().on('data', (chunk) => {
                this.emit('audioData', {
                    recordingId: this.recordingId,
                    chunkSize: chunk.length,
                    timestamp: Date.now()
                });
            });
            
            this.audioStream.stream().on('error', (error) => {
                console.error('Audio recording error:', error);
                this.emit('audioError', {
                    recordingId: this.recordingId,
                    error: error.message
                });
                this.isRecording = false;
            });
            
            this.isRecording = true;
            
            const recordingInfo = {
                recordingId: this.recordingId,
                filename,
                filePath: this.recordingFilePath,
                startTime: this.recordingStartTime,
                settings: this.settings
            };
            
            this.currentRecording = recordingInfo;
            
            // Emit recording started event
            this.emit('recordingStarted', recordingInfo);
            
            console.log(`✅ Audio recording started: ${filename}`);
            
            return recordingInfo;
            
        } catch (error) {
            console.error('❌ Failed to start audio recording:', error);
            this.isRecording = false;
            this.emit('audioError', {
                error: error.message
            });
            throw error;
        }
    }

    async stopRecording() {
        if (!this.isRecording) {
            throw new Error('No recording in progress');
        }

        try {
            console.log('⏹️ Stopping audio recording...');
            
            const recordingEndTime = Date.now();
            const duration = recordingEndTime - this.recordingStartTime;
            
            // Stop the recording
            if (this.audioStream) {
                this.audioStream.stop();
                this.audioStream = null;
            }
            
            // Wait a moment for file to be written completely
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get file stats
            let fileSize = 0;
            try {
                const stats = await fs.stat(this.recordingFilePath);
                fileSize = stats.size;
            } catch (error) {
                console.warn('Could not get recording file stats:', error.message);
            }
            
            const recordingResult = {
                recordingId: this.recordingId,
                filename: path.basename(this.recordingFilePath),
                filePath: this.recordingFilePath,
                startTime: this.recordingStartTime,
                endTime: recordingEndTime,
                duration,
                fileSize,
                settings: this.settings
            };
            
            // Reset state
            this.isRecording = false;
            this.currentRecording = null;
            this.recordingStartTime = null;
            this.recordingFilePath = null;
            this.recordingId = null;
            
            // Emit recording stopped event
            this.emit('recordingStopped', recordingResult);
            
            console.log(`✅ Audio recording stopped. Duration: ${duration}ms, Size: ${fileSize} bytes`);
            
            return recordingResult;
            
        } catch (error) {
            console.error('❌ Failed to stop audio recording:', error);
            this.emit('audioError', {
                recordingId: this.recordingId,
                error: error.message
            });
            throw error;
        }
    }

    getRecordingProgram() {
        // Determine the best recording program for the platform
        const platform = process.platform;
        
        switch (platform) {
            case 'darwin': // macOS
                return 'rec'; // from SoX
            case 'linux':
                return 'arecord'; // ALSA
            case 'win32':
                return 'sox'; // SoX for Windows
            default:
                return 'rec'; // Default to SoX
        }
    }

    async getAvailableDevices() {
        // This is a simplified implementation
        // In a real application, you'd query the system for available audio devices
        try {
            const platform = process.platform;
            const devices = [];
            
            switch (platform) {
                case 'darwin':
                    // macOS: Use system_profiler to get audio devices
                    devices.push({
                        id: 'default',
                        name: 'Default Microphone',
                        isDefault: true
                    });
                    break;
                    
                case 'linux':
                    // Linux: Use arecord -l to list devices
                    devices.push({
                        id: 'default',
                        name: 'Default Audio Device',
                        isDefault: true
                    });
                    break;
                    
                case 'win32':
                    // Windows: Use system APIs
                    devices.push({
                        id: 'default',
                        name: 'Default Recording Device',
                        isDefault: true
                    });
                    break;
                    
                default:
                    devices.push({
                        id: 'default',
                        name: 'Default Device',
                        isDefault: true
                    });
            }
            
            return devices;
            
        } catch (error) {
            console.error('Failed to get audio devices:', error);
            return [{
                id: 'default',
                name: 'Default Device',
                isDefault: true
            }];
        }
    }

    async testRecording(duration = 5000) {
        if (this.isRecording) {
            throw new Error('Another recording is in progress');
        }

        try {
            console.log(`🧪 Testing audio recording for ${duration}ms...`);
            
            const testFilename = `test_recording_${Date.now()}.wav`;
            
            // Start recording
            const recordingInfo = await this.startRecording(testFilename);
            
            // Stop after specified duration
            setTimeout(async () => {
                if (this.isRecording) {
                    await this.stopRecording();
                }
            }, duration);
            
            return {
                success: true,
                message: `Test recording started: ${testFilename}`,
                recordingInfo
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Test recording failed: ${error.message}`,
                error: error.message
            };
        }
    }

    getStatus() {
        return {
            isRecording: this.isRecording,
            recordingId: this.recordingId,
            filename: this.recordingFilePath ? path.basename(this.recordingFilePath) : null,
            duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
            settings: this.settings,
            isAvailable: !!audioRecorder
        };
    }

    updateSettings(newSettings) {
        if (this.isRecording) {
            throw new Error('Cannot update settings while recording');
        }
        
        this.settings = { ...this.settings, ...newSettings };
        
        console.log('🔧 Audio recording settings updated:', this.settings);
        
        this.emit('settingsUpdated', this.settings);
    }

    async deleteRecording(filePath) {
        try {
            await fs.unlink(filePath);
            console.log(`🗑️ Deleted recording: ${filePath}`);
            
            this.emit('recordingDeleted', { filePath });
            
            return true;
        } catch (error) {
            console.error('Failed to delete recording:', error);
            throw error;
        }
    }

    async listRecordings() {
        try {
            const files = await fs.readdir(this.audioDir);
            const recordings = [];
            
            for (const filename of files) {
                if (filename.endsWith('.wav') || filename.endsWith('.mp3')) {
                    const filePath = path.join(this.audioDir, filename);
                    
                    try {
                        const stats = await fs.stat(filePath);
                        recordings.push({
                            filename,
                            filePath,
                            size: stats.size,
                            created: stats.birthtime,
                            modified: stats.mtime
                        });
                    } catch (error) {
                        console.warn(`Could not get stats for ${filename}:`, error.message);
                    }
                }
            }
            
            // Sort by creation time (newest first)
            recordings.sort((a, b) => b.created - a.created);
            
            return recordings;
            
        } catch (error) {
            console.error('Failed to list recordings:', error);
            return [];
        }
    }

    async getRecordingInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const filename = path.basename(filePath);
            
            return {
                filename,
                filePath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                duration: null, // Would need audio analysis library to get duration
                format: path.extname(filename).slice(1)
            };
        } catch (error) {
            throw new Error(`Could not get recording info: ${error.message}`);
        }
    }

    // Utility method to convert audio format
    async convertAudio(inputPath, outputPath, format = 'mp3') {
        // This would require a library like ffmpeg
        // For now, just return a placeholder
        throw new Error('Audio conversion not implemented');
    }

    // Method to get recording duration
    async getRecordingDuration(filePath) {
        // This would require an audio analysis library
        // For now, return null
        return null;
    }

    isRecordingAvailable() {
        return !!audioRecorder;
    }

    async cleanup() {
        if (this.isRecording) {
            await this.stopRecording();
        }
        
        console.log('🧹 Audio recorder cleanup completed');
    }
}

module.exports = AudioRecorder;
