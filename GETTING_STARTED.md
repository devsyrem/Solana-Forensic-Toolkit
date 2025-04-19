# SolFlow: Getting Started Guide

This guide will help you set up and run the SolFlow Solana Transaction Visualization platform on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or later)
- **npm** (usually comes with Node.js)
- **PostgreSQL** database (version 13 or later)
- A Solana RPC endpoint (public or private)

## Installation Steps

### 1. Clone the Repository

Start by cloning the repository to your local machine:

```bash
git clone https://github.com/your-username/solflow.git
cd solflow
```

### 2. Install Dependencies

Install all the required project dependencies:

```bash
npm install
```

This will install all the necessary packages defined in the `package.json` file, including both frontend and backend dependencies.

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following environment variables:

```
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/solflow

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Server Configuration
PORT=5000
NODE_ENV=development
SESSION_SECRET=your_secret_session_key

# Optional: OpenAI API Key (for AI-powered analytics)
# OPENAI_API_KEY=your_openai_api_key
```

Replace the placeholder values with your actual configuration:
- `username`, `password`: Your PostgreSQL credentials
- `SOLANA_RPC_URL`: A Solana RPC endpoint (public or private)
- `SESSION_SECRET`: A secure random string for session encryption

### 4. Set Up the Database

Initialize the PostgreSQL database:

1. Create a new PostgreSQL database named `solflow`:

```bash
createdb solflow
```

2. Push the database schema using Drizzle ORM:

```bash
npm run db:push
```

This will create all the necessary tables in your database according to the schema defined in the `shared/schema.ts` file.

### 5. Start the Development Server

Launch the development server:

```bash
npm run dev
```

This will start both the backend server and the frontend development server concurrently. The application will be available at `http://localhost:5000`.

## Accessing the Application

Open your web browser and navigate to:

```
http://localhost:5000
```

You should see the SolFlow login page. Since this is a fresh installation, you'll need to create a new account.

## Initial Setup

### Creating Your First Account

1. Click on "Create Account" from the login page
2. Fill in your desired username, email, and password
3. Submit the form to create your account
4. You'll be automatically logged in after successful account creation

### Exploring Transaction Flows

1. After logging in, you'll see the main dashboard
2. Enter a Solana wallet address in the search box
3. Click "Search" to fetch and visualize the wallet's transaction data
4. The graph visualization will show the wallet and its connections
5. Use the filter sidebar to narrow down the transactions by date, amount, or type

### Saving Visualizations

1. After creating a visualization, click the "Save & Share" button
2. Enter a name and optional description for your visualization
3. Click "Save" to store the visualization for future access
4. Saved visualizations will appear in your dashboard

### Creating Teams and Collaborating

1. Navigate to the "Teams" section from the main menu
2. Click "Create New Team" and provide a team name and description
3. Add team members by entering their email addresses
4. Assign appropriate roles (admin, member, viewer)
5. Share visualizations with your team for collaborative analysis

## API Access

SolFlow exposes several API endpoints that you can use to integrate with other applications:

- `/api/wallets/:address` - Get wallet information
- `/api/wallets/:address/transactions` - Get wallet transactions
- `/api/visualizations` - Manage visualizations

API requests require authentication using a session cookie. Make sure you're logged in before accessing the API.

## Advanced Configuration

### Using a Custom Solana RPC Endpoint

For better performance and reliability, consider using a dedicated Solana RPC endpoint:

1. Sign up for a service like QuickNode, Alchemy, or Helius
2. Get your dedicated RPC URL
3. Update the `SOLANA_RPC_URL` in your `.env` file

### Enabling AI-Powered Analytics

To enable the AI-powered transaction pattern detection features:

1. Obtain an OpenAI API key from https://platform.openai.com
2. Add the API key to your `.env` file as `OPENAI_API_KEY`
3. Restart the application

### Database Performance Optimization

For large-scale deployments, consider these database optimizations:

1. Add appropriate indexes to frequently queried fields
2. Increase PostgreSQL connection pool size in the `server/db.ts` file
3. Configure database connection timeouts and SSL settings as needed

## Troubleshooting

### Application Fails to Start

If the application fails to start, check:

1. Database connection: Ensure your PostgreSQL server is running and accessible
2. Port conflicts: Make sure port 5000 is not in use by another application
3. Environment variables: Verify all required environment variables are set correctly

### Slow Transaction Loading

If transaction data loads slowly:

1. Check your Solana RPC endpoint performance
2. Consider using a dedicated RPC service
3. Apply more specific filters to reduce the amount of data fetched

### Authentication Issues

If you encounter login problems:

1. Clear your browser cookies
2. Check that the database tables for users and sessions are properly created
3. Verify that the `SESSION_SECRET` environment variable is set

### Missing Transaction Data

If transaction data appears incomplete:

1. Public RPC endpoints may have rate limits or data retention policies
2. Some specialized transactions might not be parsed correctly
3. Try using a dedicated RPC endpoint with complete historical data

## Next Steps

After getting familiar with the basic features, explore these advanced capabilities:

1. **Entity Labeling**: Identify and tag known entities like exchanges and projects
2. **Pattern Detection**: Use the analysis tools to identify suspicious transaction patterns
3. **Custom Dashboards**: Create specialized views for specific analysis needs
4. **Team Workflows**: Set up collaborative workflows for transaction investigations
5. **API Integration**: Connect SolFlow with your existing tools and systems

For more detailed information, refer to the full [Documentation](README.md) and [Technical Guide](TECHNICAL.md).

## Support

If you encounter any issues or have questions, please:

1. Check the existing documentation
2. Look for similar issues in the GitHub repository
3. Open a new GitHub issue with detailed information about your problem

---

Happy transaction analyzing with SolFlow! 🚀