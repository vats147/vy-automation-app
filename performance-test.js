const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import both processors for comparison
const MCPEnhancedNaturalLanguageProcessor = require('./src/services/mcp-enhanced-natural-language-processor');
const OriginalNaturalLanguageProcessor = require('./src/services/natural-language-processor');

class PerformanceTestSuite {
    constructor() {
        this.mcpProcessor = new MCPEnhancedNaturalLanguageProcessor();
        this.originalProcessor = new OriginalNaturalLanguageProcessor();
        this.testResults = [];
        this.testCommands = [
            "click the OK button",
            "find the search field and type hello",
            "open terminal and run ls",
            "take a screenshot",
            "press command+space to open spotlight",
            "click at center of screen",
            "open VS Code",
            "find all clickable elements",
            "type text in the input field",
            "open System Preferences"
        ];
    }

    async initialize() {
        console.log('🚀 Initializing Performance Test Suite...');
        
        try {
            console.log('📊 Initializing MCP-Enhanced Processor...');
            const mcpInit = await this.mcpProcessor.initialize();
            console.log(`✅ MCP-Enhanced: ${mcpInit ? 'Ready' : 'Limited mode'}`);
            
            console.log('📊 Initializing Original Processor...');
            const originalInit = await this.originalProcessor.initialize();
            console.log(`✅ Original: ${originalInit ? 'Ready' : 'Limited mode'}`);
            
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            return false;
        }
    }

    async runPerformanceTest() {
        console.log('\n🎯 Starting Performance Comparison Test');
        console.log('=' * 60);
        
        const results = {
            timestamp: new Date().toISOString(),
            test_configuration: {
                commands_tested: this.testCommands.length,
                dry_run: true,
                iterations: 3
            },
            mcp_enhanced: {
                total_time: 0,
                average_time: 0,
                success_rate: 0,
                enhanced_commands: 0,
                fallback_commands: 0,
                results: []
            },
            original: {
                total_time: 0,
                average_time: 0,
                success_rate: 0,
                results: []
            },
            performance_improvement: {
                speed_factor: 0,
                success_improvement: 0,
                enhancement_rate: 0
            }
        };

        // Test MCP-Enhanced Processor
        console.log('\n🔥 Testing MCP-Enhanced Natural Language Processor...');
        for (let i = 0; i < this.testCommands.length; i++) {
            const command = this.testCommands[i];
            console.log(`\n📝 [${i + 1}/${this.testCommands.length}] Testing: "${command}"`);
            
            const mcpResult = await this.testCommand(this.mcpProcessor, command, 'mcp-enhanced');
            results.mcp_enhanced.results.push(mcpResult);
            results.mcp_enhanced.total_time += mcpResult.execution_time;
            
            if (mcpResult.success) {
                results.mcp_enhanced.success_rate++;
            }
            if (mcpResult.mcp_enhanced) {
                results.mcp_enhanced.enhanced_commands++;
            } else {
                results.mcp_enhanced.fallback_commands++;
            }
            
            // Small delay between tests
            await this.delay(1000);
        }

        // Test Original Processor
        console.log('\n📷 Testing Original Natural Language Processor...');
        for (let i = 0; i < this.testCommands.length; i++) {
            const command = this.testCommands[i];
            console.log(`\n📝 [${i + 1}/${this.testCommands.length}] Testing: "${command}"`);
            
            const originalResult = await this.testCommand(this.originalProcessor, command, 'original');
            results.original.results.push(originalResult);
            results.original.total_time += originalResult.execution_time;
            
            if (originalResult.success) {
                results.original.success_rate++;
            }
            
            // Small delay between tests
            await this.delay(1000);
        }

        // Calculate performance metrics
        results.mcp_enhanced.average_time = results.mcp_enhanced.total_time / this.testCommands.length;
        results.mcp_enhanced.success_rate = (results.mcp_enhanced.success_rate / this.testCommands.length) * 100;
        
        results.original.average_time = results.original.total_time / this.testCommands.length;
        results.original.success_rate = (results.original.success_rate / this.testCommands.length) * 100;
        
        // Calculate improvements
        if (results.original.average_time > 0) {
            results.performance_improvement.speed_factor = results.original.average_time / results.mcp_enhanced.average_time;
        }
        results.performance_improvement.success_improvement = results.mcp_enhanced.success_rate - results.original.success_rate;
        results.performance_improvement.enhancement_rate = (results.mcp_enhanced.enhanced_commands / this.testCommands.length) * 100;

        // Display results
        this.displayResults(results);
        
        // Save results to file
        await this.saveResults(results);
        
        return results;
    }

    async testCommand(processor, command, processorType) {
        const startTime = performance.now();
        
        try {
            console.log(`⚡ Processing with ${processorType}...`);
            
            const result = await processor.processCommand(command, { dryRun: true });
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            console.log(`✅ ${processorType} completed in ${executionTime.toFixed(2)}ms`);
            if (result.mcp_enhanced !== undefined) {
                console.log(`📊 MCP Enhanced: ${result.mcp_enhanced ? 'Yes' : 'Fallback'}`);
            }
            
            return {
                command,
                processor_type: processorType,
                success: result.success,
                execution_time: executionTime,
                mcp_enhanced: result.mcp_enhanced || false,
                context_quality: result.context?.fallback ? 'fallback' : 'high',
                steps_count: result.plan?.steps?.length || 0,
                error: result.error || null,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            console.error(`❌ ${processorType} failed in ${executionTime.toFixed(2)}ms:`, error.message);
            
            return {
                command,
                processor_type: processorType,
                success: false,
                execution_time: executionTime,
                mcp_enhanced: false,
                context_quality: 'error',
                steps_count: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    displayResults(results) {
        console.log('\n' + '=' * 80);
        console.log('📊 PERFORMANCE TEST RESULTS');
        console.log('=' * 80);
        
        console.log('\n🔥 MCP-Enhanced Natural Language Processor:');
        console.log(`   ⏱️  Total Time: ${results.mcp_enhanced.total_time.toFixed(2)}ms`);
        console.log(`   📊 Average Time: ${results.mcp_enhanced.average_time.toFixed(2)}ms`);
        console.log(`   ✅ Success Rate: ${results.mcp_enhanced.success_rate.toFixed(1)}%`);
        console.log(`   🚀 Enhanced Commands: ${results.mcp_enhanced.enhanced_commands}/${this.testCommands.length}`);
        console.log(`   🔄 Fallback Commands: ${results.mcp_enhanced.fallback_commands}/${this.testCommands.length}`);
        
        console.log('\n📷 Original Natural Language Processor:');
        console.log(`   ⏱️  Total Time: ${results.original.total_time.toFixed(2)}ms`);
        console.log(`   📊 Average Time: ${results.original.average_time.toFixed(2)}ms`);
        console.log(`   ✅ Success Rate: ${results.original.success_rate.toFixed(1)}%`);
        
        console.log('\n🎯 Performance Improvement:');
        console.log(`   ⚡ Speed Factor: ${results.performance_improvement.speed_factor.toFixed(2)}x faster`);
        console.log(`   📈 Success Improvement: ${results.performance_improvement.success_improvement.toFixed(1)}%`);
        console.log(`   🔥 Enhancement Rate: ${results.performance_improvement.enhancement_rate.toFixed(1)}%`);
        
        // Performance analysis
        console.log('\n🔍 Analysis:');
        if (results.performance_improvement.speed_factor >= 5) {
            console.log('   🎉 EXCELLENT: Achieved 5x+ speed improvement goal!');
        } else if (results.performance_improvement.speed_factor >= 2) {
            console.log('   ✅ GOOD: Significant speed improvement achieved');
        } else if (results.performance_improvement.speed_factor >= 1.5) {
            console.log('   📊 MODERATE: Some speed improvement achieved');
        } else {
            console.log('   ⚠️  LIMITED: Speed improvement below expectations');
        }
        
        if (results.performance_improvement.enhancement_rate >= 70) {
            console.log('   🔥 HIGH MCP UTILIZATION: Most commands using enhanced processing');
        } else if (results.performance_improvement.enhancement_rate >= 40) {
            console.log('   📊 MODERATE MCP UTILIZATION: Some commands using enhanced processing');
        } else {
            console.log('   🔄 LOW MCP UTILIZATION: Mostly fallback processing');
        }
        
        console.log('\n' + '=' * 80);
    }

    async saveResults(results) {
        const resultsDir = './performance-test-results';
        
        // Create results directory if it doesn't exist
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `performance-test-${timestamp}.json`;
        const filepath = path.join(resultsDir, filename);
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
            console.log(`💾 Results saved to: ${filepath}`);
            
            // Also create a summary report
            const summaryFilename = `performance-summary-${timestamp}.txt`;
            const summaryPath = path.join(resultsDir, summaryFilename);
            
            const summary = this.generateTextSummary(results);
            fs.writeFileSync(summaryPath, summary);
            console.log(`📄 Summary saved to: ${summaryPath}`);
            
        } catch (error) {
            console.error('❌ Failed to save results:', error);
        }
    }

    generateTextSummary(results) {
        return `Vy Automation Performance Test Results
=====================================

Test Date: ${results.timestamp}
Commands Tested: ${results.test_configuration.commands_tested}

MCP-Enhanced Processor Results:
- Average Execution Time: ${results.mcp_enhanced.average_time.toFixed(2)}ms
- Success Rate: ${results.mcp_enhanced.success_rate.toFixed(1)}%
- Enhanced Commands: ${results.mcp_enhanced.enhanced_commands}/${this.testCommands.length}
- Fallback Commands: ${results.mcp_enhanced.fallback_commands}/${this.testCommands.length}

Original Processor Results:
- Average Execution Time: ${results.original.average_time.toFixed(2)}ms
- Success Rate: ${results.original.success_rate.toFixed(1)}%

Performance Improvement:
- Speed Factor: ${results.performance_improvement.speed_factor.toFixed(2)}x faster
- Success Improvement: ${results.performance_improvement.success_improvement.toFixed(1)}%
- Enhancement Rate: ${results.performance_improvement.enhancement_rate.toFixed(1)}%

Command-by-Command Results:
${this.testCommands.map((cmd, i) => {
    const mcpResult = results.mcp_enhanced.results[i];
    const originalResult = results.original.results[i];
    const speedup = originalResult.execution_time / mcpResult.execution_time;
    
    return `
${i + 1}. "${cmd}"
   MCP: ${mcpResult.execution_time.toFixed(2)}ms (${mcpResult.success ? 'Success' : 'Failed'}) ${mcpResult.mcp_enhanced ? '[Enhanced]' : '[Fallback]'}
   Original: ${originalResult.execution_time.toFixed(2)}ms (${originalResult.success ? 'Success' : 'Failed'})
   Speedup: ${speedup.toFixed(2)}x`;
}).join('\n')}

Analysis:
${results.performance_improvement.speed_factor >= 5 ? 
    '✅ SUCCESS: Achieved 5x+ speed improvement goal!' : 
    '⚠️ Room for improvement in speed enhancement'}

${results.performance_improvement.enhancement_rate >= 70 ? 
    '✅ High MCP utilization rate' : 
    '⚠️ Consider improving MCP server connectivity'}
`;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up test environment...');
        
        try {
            if (this.mcpProcessor.disconnect) {
                await this.mcpProcessor.disconnect();
            }
            if (this.originalProcessor.disconnect) {
                await this.originalProcessor.disconnect();
            }
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// Run the performance test
async function runTest() {
    const testSuite = new PerformanceTestSuite();
    
    try {
        console.log('🎯 Vy Automation Performance Test Suite');
        console.log('Testing MCP-Enhanced vs Original Natural Language Processing');
        console.log('=' * 60);
        
        const initialized = await testSuite.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize test suite');
            process.exit(1);
        }
        
        const results = await testSuite.runPerformanceTest();
        
        await testSuite.cleanup();
        
        console.log('\n🎉 Performance test completed successfully!');
        
        // Exit with appropriate code based on performance
        if (results.performance_improvement.speed_factor >= 2) {
            console.log('✅ Performance goals achieved!');
            process.exit(0);
        } else {
            console.log('⚠️ Performance goals not fully met');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        await testSuite.cleanup();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runTest();
}

module.exports = PerformanceTestSuite;
