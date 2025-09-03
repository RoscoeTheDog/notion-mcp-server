#!/usr/bin/env node

/**
 * Notion MCP Server Installation Script
 * 
 * This script automatically installs and configures the Notion MCP server
 * for use with Claude Desktop and Claude Code CLI. It handles cross-platform
 * installation, dependency checking, and configuration setup.
 * 
 * Usage: node scripts/install.js [--config=path/to/config.json]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class NotionMcpInstaller {
    constructor() {
        this.platform = os.platform();
        this.projectRoot = path.dirname(__dirname);
        this.config = null;
        this.claudeConfigDir = this.getClaudeConfigDir();
        this.logPrefix = '[Notion MCP Installer]';
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} ${this.logPrefix} ${message}`);
    }

    error(message, exit = true) {
        this.log(message, 'error');
        if (exit) process.exit(1);
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
                this.error(`Unsupported platform: ${this.platform}`);
        }
    }

    loadConfig() {
        const configArg = process.argv.find(arg => arg.startsWith('--config='));
        const configPath = configArg 
            ? configArg.split('=')[1]
            : path.join(this.projectRoot, 'scripts', 'install-config.json');

        if (fs.existsSync(configPath)) {
            try {
                this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.log(`Loaded configuration from: ${configPath}`);
            } catch (error) {
                this.error(`Failed to parse configuration file: ${error.message}`);
            }
        } else {
            // Create default config
            this.config = {
                notionToken: "",
                verbose: false
            };
            this.log('Using default configuration (no config file found)');
        }
    }

    checkSystemDependencies() {
        this.log('Checking system dependencies...');

        // Check Node.js version
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
            this.log(`Node.js version: ${nodeVersion} ✓`);
            
            // Check if Node.js version is sufficient (v16+)
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
            this.log(`npm version: ${npmVersion} ✓`);
        } catch (error) {
            this.error('npm is not installed or not in PATH');
        }

        this.success('System dependencies check completed');
    }

    buildProject() {
        this.log('Building Notion MCP server...');

        try {
            // Install dependencies
            this.log('Installing dependencies...');
            execSync('npm install', {
                cwd: this.projectRoot,
                stdio: this.config.verbose ? 'inherit' : 'pipe',
                encoding: 'utf8'
            });

            // Build the project
            this.log('Building project...');
            execSync('npm run build', {
                cwd: this.projectRoot,
                stdio: this.config.verbose ? 'inherit' : 'pipe',
                encoding: 'utf8'
            });

            // Verify CLI binary exists
            const cliBinary = path.join(this.projectRoot, 'bin', 'cli.mjs');
            if (!fs.existsSync(cliBinary)) {
                throw new Error('CLI binary not found after build');
            }

            this.success('Project build completed successfully');
        } catch (error) {
            this.error(`Failed to build project: ${error.message}`);
        }
    }

    testNotionMcpServer() {
        this.log('Testing Notion MCP server...');

        try {
            const cliBinary = path.join(this.projectRoot, 'bin', 'cli.mjs');
            const result = execSync(`node "${cliBinary}" --help`, {
                encoding: 'utf8',
                timeout: 15000,
                stdio: 'pipe'
            });

            if (result.includes('Usage: notion-mcp-server')) {
                this.success('Notion MCP server test completed successfully');
            } else {
                throw new Error('Unexpected server response');
            }
        } catch (error) {
            this.error(`Notion MCP server test failed: ${error.message}`);
        }
    }

    createClaudeConfig() {
        this.log('Creating Claude Desktop and Claude Code CLI configuration...');

        // Configure Claude Desktop
        this.configureClaudeDesktop();
        
        // Configure Claude Code CLI
        this.configureClaudeCodeCLI();
    }

    configureClaudeDesktop() {
        this.log('Configuring Claude Desktop...');

        // Ensure Claude config directory exists
        if (!fs.existsSync(this.claudeConfigDir)) {
            fs.mkdirSync(this.claudeConfigDir, { recursive: true });
            this.log(`Created Claude config directory: ${this.claudeConfigDir}`);
        }

        const configPath = path.join(this.claudeConfigDir, 'claude_desktop_config.json');
        const cliBinaryPath = path.join(this.projectRoot, 'bin', 'cli.mjs');
        
        // Create or update configuration
        let claudeConfig = { mcpServers: {} };
        
        // Load existing config if it exists
        if (fs.existsSync(configPath)) {
            try {
                claudeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (!claudeConfig.mcpServers) {
                    claudeConfig.mcpServers = {};
                }
                
                // Backup existing config
                const backupPath = `${configPath}.backup.${Date.now()}`;
                fs.copyFileSync(configPath, backupPath);
                this.log(`Backed up existing configuration to: ${backupPath}`);
            } catch (error) {
                this.log(`Warning: Could not parse existing config, creating new one`);
                claudeConfig = { mcpServers: {} };
            }
        }

        // Add Notion MCP server configuration
        claudeConfig.mcpServers["notion-mcp"] = {
            command: "node",
            args: [cliBinaryPath],
            env: {
                "NOTION_TOKEN": this.config.notionToken || ""
            }
        };

        // Write configuration
        try {
            fs.writeFileSync(configPath, JSON.stringify(claudeConfig, null, 2));
            this.success(`Claude Desktop configuration updated: ${configPath}`);
        } catch (error) {
            this.error(`Failed to write Claude Desktop configuration: ${error.message}`);
        }
    }

    configureClaudeCodeCLI() {
        this.log('Configuring Claude Code CLI...');

        try {
            const cliBinaryPath = path.join(this.projectRoot, 'bin', 'cli.mjs');
            
            // First, try to remove existing server if it exists
            try {
                this.log('Checking for existing Claude Code CLI MCP server...');
                execSync('claude mcp remove notion-mcp -s user', { 
                    stdio: 'pipe',
                    encoding: 'utf8'
                });
                this.log('Removed existing MCP server configuration');
            } catch (removeError) {
                // It's fine if removal fails (server might not exist)
                this.log('No existing MCP server found (expected for fresh installation)');
            }

            // Build the claude mcp add command
            let command = `claude mcp add notion-mcp node "${cliBinaryPath}" -s user`;
            
            // Add environment variables if token is provided
            if (this.config.notionToken) {
                command += ` --env NOTION_TOKEN="${this.config.notionToken}"`;
            }

            // Execute the command to add MCP server to Claude Code CLI
            this.log('Adding Notion MCP server to Claude Code CLI with user scope...');
            execSync(command, { 
                stdio: this.config.verbose ? 'inherit' : 'pipe',
                encoding: 'utf8'
            });

            this.success('Claude Code CLI configuration completed');
        } catch (error) {
            if (error.message.includes('already exists')) {
                this.success('Claude Code CLI MCP server already configured');
            } else {
                this.log(`Warning: Failed to configure Claude Code CLI: ${error.message}`, 'error');
                const cliBinaryPath = path.join(this.projectRoot, 'bin', 'cli.mjs');
                this.log(`You may need to manually run: claude mcp add notion-mcp node "${cliBinaryPath}" -s user`);
            }
        }
    }

    async install() {
        try {
            this.log('Starting Notion MCP Server installation...');
            
            // Step 1: Load configuration
            this.loadConfig();
            
            // Step 2: Check system dependencies
            this.checkSystemDependencies();
            
            // Step 3: Build the project
            this.buildProject();
            
            // Step 4: Test the server
            this.testNotionMcpServer();
            
            // Step 5: Create Claude configuration
            this.createClaudeConfig();
            
            this.success('Installation completed successfully!');
            this.log('');
            this.log('Configuration completed for:');
            this.log('✅ Claude Desktop - Restart Claude Desktop to load the MCP server');
            this.log('✅ Claude Code CLI - MCP server configured globally with user scope');
            this.log('');
            this.log('Next steps:');
            this.log('1. Set your Notion integration token in the configuration files if not already set');
            this.log('2. Restart Claude Desktop to load the new MCP server');
            this.log('3. Test Claude Code CLI: Open any terminal and run "claude mcp list"');
            this.log('4. The Notion MCP server will be available for Notion workspace integration');
            this.log('5. Run "node scripts/verify.js" to verify the installation (if verify script exists)');
            this.log('');
            
        } catch (error) {
            this.error(`Installation failed: ${error.message}`);
        }
    }
}

// Run installer if called directly
if (require.main === module) {
    const installer = new NotionMcpInstaller();
    installer.install().catch(error => {
        console.error('Installation failed:', error);
        process.exit(1);
    });
}

module.exports = NotionMcpInstaller;