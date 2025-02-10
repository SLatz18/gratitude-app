# Gratitude App

A journaling application to track things you're grateful for. This full-stack app uses an Express API, PostgreSQL for data storage, and a simple HTML/JavaScript front end to allow users to create, view, update, and delete their gratitude entries.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation & Deployment](#installation--deployment)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Development](#development)
- [Future Enhancements](#future-enhancements)
- [License](#license)

## Overview

The Gratitude App is designed to help users document daily moments of gratitude. Each entry includes text content and optional tags, and entries are displayed in a simple, user-friendly interface. The app is designed for deployment on [Render.com](https://render.com), with all testing and deployment handled on that platform.

## Features

- **Create Entries:** Add new gratitude entries with a text description and tags.
- **Read Entries:** View all entries in descending order by creation date.
- **Update & Delete:** API endpoints for updating and removing entries.
- **Automatic Table Initialization:** The PostgreSQL table (`entries`) is created programmatically if it doesn't exist.
- **Responsive UI:** A simple HTML/JavaScript front end to interact with the API.

## Tech Stack

- **Backend:**
  - [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
  - PostgreSQL (using the `pg` package for Node.js)
- **Frontend:**
  - Plain HTML, CSS, and JavaScript served directly by the Express server
- **Deployment:**
  - [Render.com](https://render.com/) for hosting the application

## Installation & Deployment

Since all testing and deployment are done on Render, follow these steps to deploy:

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/gratitude-app.git
   cd gratitude-app
   ```

2. **Set Environment Variables on Render:**

   - In your Render dashboard, add the `DATABASE_URL` environment variable with your PostgreSQL connection string.
   - Render automatically sets the `PORT` variable, which the app uses to bind the server.

3. **Deploy on Render:**

   - Push your repository to GitHub.

   - Create a new Web Service on Render and connect your GitHub repository.

   - Set the **Start Command** to:

     ```bash
     node index.js
     ```

   - Render will build and deploy your application.

## Environment Variables

- **DATABASE\_URL:**\
  Your PostgreSQL connection string. This variable must be set on Render for the application to connect to the database.

## Usage

Once deployed, the app works as follows:

### Front End

Accessing the root URL (e.g., `https://your-app.onrender.com/`) displays the Gratitude Journal UI. Users can add a new entry using the provided form.

### API Endpoints

- \*\*GET \*\*\`\`\
  Returns all gratitude entries in JSON format.

- \*\*POST \*\*\`\`\
  Creates a new entry. Expects a JSON payload with `content` and `tags`.

- \*\*GET \*\*\`\`\
  Retrieves a single entry by its ID.

- \*\*PUT \*\*\`\`\
  Updates an existing entry. Expects a JSON payload with updated `content` and `tags`.

- \*\*DELETE \*\*\`\`\
  Deletes an entry by its ID.

## Development

If you want to develop or test locally (when possible), you can:

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the server locally** (make sure to set the environment variable `DATABASE_URL`):

   ```bash
   node index.js
   ```

> **Note:** The primary development and testing workflow is via Render if you are not running a local JavaScript environment.

## Future Enhancements

- Implement user authentication for personalized entries.
- Add sorting and filtering options on the front end.
- Enhance UI/UX with modern frontend frameworks (e.g., React or Next.js).
- Use migration tools for managing database schema changes.

## License

This project is licensed under the [MIT License](LICENSE).

