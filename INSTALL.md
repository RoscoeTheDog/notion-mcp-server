# Notion MCP Server Installation Guide

This guide provides automated installation scripts for setting up the Notion MCP server globally on your system, making it accessible from both Claude Desktop and Claude Code CLI from any directory.

## Quick Installation

### Prerequisites

- **Node.js**: Version 16 or higher required
- **npm**: Comes with Node.js installation
- **Notion Integration**: A Notion integration token is required for full functionality

### Automated Installation

1. **Clone or navigate to this repository**:
   ```bash
   cd /path/to/notion-mcp-server
   ```

2. **Run the installation script**:
   ```bash
   node scripts/install.cjs
   ```

3. **Verify installation**:
   ```bash
   claude mcp list
   ```
   You should see:
   ```
   notion-mcp: node /path/to/notion-mcp-server/bin/cli.mjs - ✓ Connected
   ```

## What the Installation Does

The automated installation script:

### ✅ **System Dependencies Check**
- Verifies Node.js version (16+ required)
- Checks npm availability
- Validates system compatibility

### ✅ **Project Build**
- Installs npm dependencies
- Compiles TypeScript to JavaScript
- Creates the CLI binary at `bin/cli.mjs`
- Verifies build integrity

### ✅ **Claude Desktop Configuration**
- Creates/updates `claude_desktop_config.json` in the appropriate location:
  - **Windows**: `%APPDATA%\\Roaming\\Claude\\claude_desktop_config.json`
  - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - **Linux**: `~/.config/claude/claude_desktop_config.json`
- Backs up existing configuration before making changes
- Configures NOTION_TOKEN environment variable placeholder

### ✅ **Claude Code CLI Configuration**
- Adds Notion MCP server globally with user scope using:
  ```bash
  claude mcp add notion-mcp node "/path/to/bin/cli.mjs" -s user
  ```
- Handles existing server configurations gracefully
- Makes Notion MCP available from any terminal/directory

## Manual Installation (Alternative)

If you prefer manual installation or the automated script doesn't work:

### Building the Project
```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Claude Code CLI (Manual)
```bash
# Navigate to the project directory
cd /path/to/notion-mcp-server

# Add with absolute path to CLI binary
claude mcp add notion-mcp node "/absolute/path/to/notion-mcp-server/bin/cli.mjs" -s user

# Optional: Add with environment variable
claude mcp add notion-mcp node "/absolute/path/to/notion-mcp-server/bin/cli.mjs" -s user --env NOTION_TOKEN="ntn_your_token_here"
```

### Claude Desktop (Manual)
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "notion-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/notion-mcp-server/bin/cli.mjs"],
      "env": {
        "NOTION_TOKEN": "ntn_your_token_here"
      }
    }
  }
}
```

### npm Package Installation (Alternative)
You can also use the published npm package:
```json
{
  "mcpServers": {
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "ntn_your_token_here"
      }
    }
  }
}
```

## Configuration Options

The installation script supports optional configuration via `scripts/install-config.json`:

```json
{
  "notionToken": "ntn_your_token_here",
  "verbose": false
}
```

**Note**: You can set the Notion token in the config file, but it's more secure to set it directly in the Claude configuration files after installation.

## Notion Integration Setup

### 1. Create Notion Integration
1. Go to [https://www.notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Click "Create new integration" or select an existing one
3. Configure integration capabilities (read/write permissions)
4. Copy the integration token (starts with "ntn_")

![Creating a Notion Integration token](docs/images/integrations-creation.png)

### 2. Configure Integration Access
Grant your integration access to the pages/databases you want to use:

**Option 1: Bulk Access Configuration**
1. Visit the **Access** tab in your integration settings
2. Click "Edit access" and select the pages you'd like to use

**Option 2: Individual Page Access**
1. Visit the target page in Notion
2. Click the 3 dots menu → "Connect to integration"
3. Select your integration

![Adding Integration Token to Notion Connections](docs/images/connections.png)

### 3. Add Token to Configuration
Update your Claude configuration files with the integration token:

**Claude Desktop**: Edit `claude_desktop_config.json`
```json
{
  "mcpServers": {
    "notion-mcp": {
      "env": {
        "NOTION_TOKEN": "ntn_your_actual_token_here"
      }
    }
  }
}
```

**Claude Code CLI**: Add environment variable
```bash
claude mcp add notion-mcp node "/path/to/cli.mjs" -s user --env NOTION_TOKEN="ntn_your_actual_token_here"
```

## Verification

### Test Installation
```bash
# Run the verification script
node scripts/verify.cjs
```

### Manual Testing
```bash
# Check MCP servers are listed
claude mcp list

# Test from different directories
cd ~/Desktop
claude mcp list

cd /tmp
claude mcp list
```

Both tests should show Notion MCP as connected.

### Test Notion Integration
Once configured with a valid token, you can test basic functionality:
```bash
# Test server directly
node bin/cli.mjs --help

# Check transport options
node bin/cli.mjs --transport stdio
```

## Transport Options

The Notion MCP Server supports multiple transport modes:

### STDIO Transport (Default)
```bash
node bin/cli.mjs
# or
node bin/cli.mjs --transport stdio
```

### Streamable HTTP Transport
```bash
# Default port 3000
node bin/cli.mjs --transport http

# Custom port
node bin/cli.mjs --transport http --port 8080

# With authentication token
node bin/cli.mjs --transport http --auth-token "your-secret-token"
```

## Troubleshooting

### Node.js Version Issues
The Notion MCP server requires Node.js 16 or higher:
```bash
# Check version
node --version

# Update if necessary (using nvm)
nvm install 16
nvm use 16
```

### Build Failures
1. Ensure all dependencies are installed:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check for TypeScript compilation errors:
   ```bash
   npm run build
   ```

### Server Not Connecting
1. Verify the CLI binary exists and is executable:
   ```bash
   ls -la bin/cli.mjs
   node bin/cli.mjs --help
   ```

2. Check Claude configuration paths are correct:
   ```bash
   claude mcp list
   ```

3. Remove and re-add the server:
   ```bash
   claude mcp remove notion-mcp -s user
   claude mcp add notion-mcp node "/absolute/path/to/bin/cli.mjs" -s user
   ```

### Notion Integration Issues
1. **Invalid Token**: Ensure your token starts with "ntn_" and is copied correctly
2. **Access Denied**: Grant your integration access to the pages you want to use
3. **API Limits**: Check Notion's API rate limits if requests are failing

### Configuration Issues
- **Claude Desktop**: Restart Claude Desktop after changing configuration
- **Claude Code CLI**: The server should be available immediately
- **Permissions**: Ensure you have write permissions to Claude config directories

## Uninstallation

To remove Notion MCP server:

```bash
# Remove from Claude Code CLI
claude mcp remove notion-mcp -s user

# Manually edit Claude Desktop config to remove the notion-mcp section
```

## Architecture

This installation creates:

1. **Global Configuration**: Notion MCP is configured with user scope (`-s user`) making it available from any directory
2. **Cross-Platform**: Works on Windows, macOS, and Linux
3. **Node.js Integration**: Uses the local build of the MCP server for optimal performance
4. **Notion API Integration**: Connects directly to Notion's API using integration tokens

## Usage After Installation

Once installed, the Notion MCP server provides comprehensive Notion workspace integration accessible through Claude Code CLI and Claude Desktop:

- **Page Management**: Create, read, update pages and subpages
- **Database Operations**: Query databases, create entries, update properties
- **Comment System**: Add and retrieve comments on pages
- **Search Functionality**: Search across your Notion workspace
- **Content Retrieval**: Get specific page content by ID or search
- **Block Operations**: Work with different types of Notion blocks

### Example Commands
```bash
# Through Claude Code CLI, you can now use natural language like:
# - "Comment 'Hello MCP' on page 'Getting started'"
# - "Add a page titled 'Notion MCP' to page 'Development'"
# - "Get the content of page [page-id]"
# - "Search for pages about 'project planning'"
```

The Notion MCP server will automatically start when Claude accesses it, providing seamless integration with your Notion workspace.

## Support

For issues with:
- **Notion MCP functionality**: See the main [Notion MCP README](README.md)
- **Installation scripts**: Check the verification output and troubleshooting steps above
- **Notion integration**: Refer to [Notion API documentation](https://developers.notion.com/reference/intro)
- **MCP integration**: Refer to [Claude MCP documentation](https://docs.anthropic.com/claude/docs/mcp)