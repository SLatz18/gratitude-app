# Gratitude App

A journaling application to track things you're grateful for. This full-stack app uses an Express API, PostgreSQL for data storage, and a simple HTML/JavaScript front end. Users can create, view, update, and delete their gratitude entries. The public view displays only entries from the current device session, while a secret page (protected by a password) shows all entries and allows deletion. Additionally, a shared word cloud built with D3 visualizes the categories returned by OpenAI.

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

The Gratitude App is designed to help users document daily moments of gratitude. Each entry includes text content and a category automatically determined by OpenAI’s API. The app is designed for deployment on [Render.com](https://render.com), with testing and deployment managed on that platform. Public users only see entries from their current session, while an admin/secret view (protected by a password) displays all entries along with a deletion option and a shared word cloud of categories.

## Features

- **Create Entries:**  
  Users can add new gratitude entries using a simple form. Each entry is automatically categorized via the OpenAI API.

- **Per-Device Public View:**  
  The public page displays only the entries created during the current session (per device).

- **Secret Page:**  
  A password-protected secret page lets administrators view all entries and delete any entry.

- **Shared Word Cloud:**  
  A word cloud built with D3 displays a summary of categories (from all entries) shared by users (excluding uncategorized items).

- **Automatic Table Initialization:**  
  The PostgreSQL table (`entries`) is created programmatically if it doesn't exist, with columns for content, category, and session ID.

- **Responsive UI:**  
  A clean, responsive HTML/JavaScript front end is provided.

## Tech Stack

- **Backend:**
  - [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
  - PostgreSQL (using the `pg` package for Node.js)
- **Frontend:**
  - Plain HTML, CSS, and JavaScript served directly by the Express server
  - [D3.js](https://d3js.org/) with [d3-cloud](https://github.com/jasondavies/d3-cloud) for the word cloud
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
   - Add the `OPENAI_API_KEY` environment variable with your OpenAI API key.
   - Add the `LIST_PASSWORD` environment variable for the secret page (for example, `mySecretPassword`).
   - *(Optional)* You can provide a `SESSION_SECRET`; if not provided, one will be auto-generated per device.

3. **Deploy on Render:**

   - Push your repository to GitHub.
   - Create a new Web Service on Render and connect your GitHub repository.
   - Set the **Start Command** to:

     ```bash
     node index.js
     ```

   - Render will build and deploy your application.

## Environment Variables

- **DATABASE_URL:**  
  Your PostgreSQL connection string. This must be set on Render for the application to connect to the database.

- **OPENAI_API_KEY:**  
  Your OpenAI API key used for categorizing entries.

- **LIST_PASSWORD:**  
  The password required to access the secret page which displays all entries and enables deletion.

- **SESSION_SECRET:** *(Optional)*  
  The secret used by `express-session` to generate sessions. If not provided, a random secret is generated at server startup.

## Usage

Once deployed, the app works as follows:

### Public Front End

- **Entry Form & Public Entries:**  
  Accessing the root URL (e.g., `https://your-app.onrender.com/`) displays the Gratitude Journal UI. Users can add entries, which are visible only on that device/session.

- **Word Cloud:**  
  A shared word cloud (built with D3) below the entries shows category frequencies from all entries (ignoring uncategorized).

### Secret Front End

- **Secret Page:**  
  Place `secret.html` in the public folder. Access it via `https://your-app.onrender.com/secret.html`.  
  Enter the password (as set in `LIST_PASSWORD`) to view all entries and delete any entry.

### API Endpoints

- **GET /api/public-entries:**  
  Returns entries created in the current session.

- **GET /api/all-entries:**  
  Returns all entries with a defined category (for the word cloud).

- **GET /api/secret-entries?password=YOUR_PASSWORD:**  
  Returns all entries if the password is correct.

- **GET /api/entries/:id:**  
  Retrieves a single entry by its ID.

- **POST /api/entries:**  
  Creates a new entry with automatic categorization.

- **PUT /api/entries/:id:**  
  Updates an existing entry (content only).

- **DELETE /api/entries/:id:**  
  Deletes an entry.

## Development

To develop or test locally:

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the server locally** (set the environment variable `DATABASE_URL` locally):

   ```bash
   node index.js
   ```

> **Note:** The primary development workflow is via Render if you are not running a local JavaScript environment.

## Future Enhancements

- Implement user authentication for personalized entries.
- Add sorting and filtering options on the front end.
- Enhance UI/UX with modern frameworks (e.g., React or Next.js).
- Integrate additional visualization tools.
- Use migration tools for managing database schema changes.

## License

This project is licensed under the [MIT License](LICENSE).
