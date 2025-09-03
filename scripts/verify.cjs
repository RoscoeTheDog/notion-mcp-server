#!/usr/bin/env node

/**
 * Notion MCP Server Verification Script
 * 
 * This script verifies that the Notion MCP server installation is working correctly
 * by checking dependencies, server functionality, and MCP integration.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class NotionMcpVerifier {
    constructor() {
        this.platform = os.platform();
        this.projectRoot = path.dirname(__dirname);
        this.claudeConfigDir = this.getClaudeConfigDir();
        this.logPrefix = '[Notion MCP Verifier]';
        this.errors = [];
        this.warnings = [];
    }

    log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} ${this.logPrefix} ${message}`);
    }

    error(message) {
        this.errors.push(message);
        this.log(message, 'error');
    }

    warning(message) {
        this.warnings.push(message);
        this.log(message, 'warning');
    }

    success(message) {
        this.log(message, 'success');
    }

    getClaudeConfigDir() {
        switch (this.platform) {
            case 'win32':
                return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude');
            case 'darwin':
                return path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
            case 'linux':
                return path.join(os.homedir(), '.config', 'claude');
            default:
                throw new Error(`Unsupported platform: ${this.platform}`);
        }
    }

    checkSystemDependencies() {
        this.log('Checking system dependencies...');

        // Check Node.js
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
            this.success(`Node.js version: ${nodeVersion}`);
            
            const versionNum = parseInt(nodeVersion.replace('v', '').split('.')[0]);
            if (versionNum < 16) {
                this.error('Node.js version 16 or higher is required');
            }
        } catch (error) {
            this.error('Node.js is not installed or not in PATH');
        }

        // Check npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
            this.success(`npm version: ${npmVersion}`);
        } catch (error) {
            this.error('npm is not installed or not in PATH');
        }
    }

    checkProjectBuild() {
        this.log('Checking project build...');

        // Check if dependencies are installed
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            this.error('Node modules not found - run "npm install"');
            return;
        }
        this.success('Node modules found');

        // Check if CLI binary exists
        const cliBinary = path.join(this.projectRoot, 'bin', 'cli.mjs');
        if (!fs.existsSync(cliBinary)) {
            this.error('CLI binary not found - run "npm run build"');
            return;
        }
        this.success('CLI binary found');

        // Test CLI binary
        try {
            const result = execSync(`node "${cliBinary}" --help`, {
                encoding: 'utf8',
                timeout: 10000,
                stdio: 'pipe'
            });

            if (result.includes('Usage: notion-mcp-server')) {
                this.success('CLI binary is functional');
            } else {
                this.error('CLI binary test failed - unexpected output');
            }
        } catch (error) {
            this.error(`CLI binary test failed: ${error.message}`);
        }
    }

    checkClaudeDesktopConfig() {
        this.log('Checking Claude Desktop configuration...');

        const configPath = path.join(this.claudeConfigDir, 'claude_desktop_config.json');
        
        if (!fs.existsSync(configPath)) {
            this.warning('Claude Desktop config file not found');
            return;
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            if (!config.mcpServers) {
                this.warning('No MCP servers configured in Claude Desktop');
                return;
            }

            if (!config.mcpServers['notion-mcp']) {
                this.warning('Notion MCP server not found in Claude Desktop config');
                return;
            }

            const notionConfig = config.mcpServers['notion-mcp'];
            const cliBinaryPath = path.join(this.projectRoot, 'bin', 'cli.mjs');
            
            if (notionConfig.command !== 'node') {
                this.warning('Claude Desktop config command should be "node"');
            }

            if (!notionConfig.args || !notionConfig.args.includes(cliBinaryPath)) {
                this.warning('Claude Desktop config args do not point to correct CLI binary');
            }

            if (!notionConfig.env || !notionConfig.env.hasOwnProperty('NOTION_TOKEN')) {
                this.warning('NOTION_TOKEN not configured in Claude Desktop (may need to be set manually)');
            }

            this.success('Claude Desktop configuration looks correct');
        } catch (error) {
            this.error(`Failed to parse Claude Desktop config: ${error.message}`);
        }
    }

    checkClaudeCodeCLI() {
        this.log('Checking Claude Code CLI configuration...');

        try {
            // Check if claude command exists
            execSync('claude --version', { stdio: 'pipe', encoding: 'utf8' });
        } catch (error) {
            this.warning('Claude Code CLI not found - cannot verify MCP configuration');
            return;
        }

        try {
            const result = execSync('claude mcp list', { 
                encoding: 'utf8',
                timeout: 30000,
                stdio: 'pipe'
            });

            if (result.includes('notion-mcp')) {
                if (result.includes('✓ Connected')) {
                    this.success('Notion MCP server is connected in Claude Code CLI');
                } else if (result.includes('✗ Failed to connect')) {
                    this.warning('Notion MCP server found but failed to connect in Claude Code CLI');
                } else {
                    this.warning('Notion MCP server found with unknown status in Claude Code CLI');
                }
            } else {
                this.warning('Notion MCP server not found in Claude Code CLI configuration');
            }
        } catch (error) {
            this.error(`Failed to check Claude Code CLI MCP servers: ${error.message}`);
        }
    }

    checkNotionIntegration() {
        this.log('Checking Notion integration setup...');

        // Check if NOTION_TOKEN is set in environment
        if (process.env.NOTION_TOKEN) {
            this.success('NOTION_TOKEN found in environment');
        } else {
            this.warning('NOTION_TOKEN not set in environment - will need to be configured in Claude configs');
        }

        // Check Claude Desktop config for NOTION_TOKEN
        const configPath = path.join(this.claudeConfigDir, 'claude_desktop_config.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.mcpServers && config.mcpServers['notion-mcp'] && 
                    config.mcpServers['notion-mcp'].env && 
                    config.mcpServers['notion-mcp'].env.NOTION_TOKEN) {
                    
                    const token = config.mcpServers['notion-mcp'].env.NOTION_TOKEN;
                    if (token && token.length > 0) {
                        this.success('NOTION_TOKEN configured in Claude Desktop');
                    } else {
                        this.warning('NOTION_TOKEN is empty in Claude Desktop config');
                    }
                }
            } catch (error) {
                // Already handled in checkClaudeDesktopConfig
            }
        }

        this.log('');
        this.log('📝 Notion Integration Setup Instructions:');
        this.log('1. Go to https://www.notion.so/profile/integrations');
        this.log('2. Create a new internal integration or select an existing one');
        this.log('3. Copy the integration token (starts with "ntn_")');
        this.log('4. Add the token to your Claude configurations');
        this.log('5. Grant page access to your integration in Notion');
    }

    async verify() {
        this.log('Starting Notion MCP Server verification...');
        this.log('');

        // Run all verification checks
        this.checkSystemDependencies();
        this.log('');
        
        this.checkProjectBuild();
        this.log('');
        
        this.checkClaudeDesktopConfig();
        this.log('');
        
        this.checkClaudeCodeCLI();
        this.log('');
        
        this.checkNotionIntegration();
        this.log('');

        // Summary
        this.log('='.repeat(50));
        this.log('VERIFICATION SUMMARY');
        this.log('='.repeat(50));

        if (this.errors.length === 0 && this.warnings.length === 0) {
            this.success('All checks passed! Notion MCP server is ready to use.');
        } else {
            if (this.errors.length > 0) {
                this.log(`❌ ${this.errors.length} error(s) found:`);
                this.errors.forEach(error => this.log(`   - ${error}`));
            }

            if (this.warnings.length > 0) {
                this.log(`⚠️ ${this.warnings.length} warning(s) found:`);
                this.warnings.forEach(warning => this.log(`   - ${warning}`));
            }

            if (this.errors.length > 0) {
                this.log('');
                this.log('❌ Please fix the errors above before using the Notion MCP server.');
                process.exit(1);
            } else {
                this.log('');
                this.log('⚠️ The server should work, but consider addressing the warnings above.');
            }
        }
    }
}

// Run verifier if called directly
if (require.main === module) {
    const verifier = new NotionMcpVerifier();
    verifier.verify().catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = NotionMcpVerifier;