[[https://codewithmatt.hashnode.dev/understanding-the-building-blocks-of-a-web-application-routes-controllers-services-repositories-and-databases|Building blocks of a web app]]

# Routes #
  * a route is a specific endpoint that the application can respond to.
  * It represents a specific URL path and the HTTP method (GET, POST, PUT, DELETE, etc).

  * They are the entry point of our application and
  * determine how the application **responds**
  * to a client request to a particular endpoint.

  * Think of routes as the menu at the restaurant.
  * Each menu item represents a different route that the customer can choose,

# Controllers #
  * Once the route receives a request from a client,
  * it needs to handle that request and send a response back to the client.
  * They are responsible for managing the flow of data between
    * the model (business logic and database) and
    * the view (what the user-end interacts with).
  * We can think of the controller as the **waiter** in a restaurant.
  * The client decides on the item (route) he wants, and
  * the waiter takes the order and communicates it to the kitchen (__services__ and __repositories__).
  * Then, they bring back the prepared food (__response to the customer__).

# Services #
  * They are responsible for the business logic of the application. This is where we define the rules, logic, and calculations.
  * Services communicate with repositories to fetch and manipulate data.

  * In our restaurant analogy, services can be thought of as the chefs in the kitchen.
  * They receive the orders from the waiter (controllers) asked by the clients and
  * then prepare the food (business logic).
  * They might need to consult the recipe (data from the database) before they start cooking.

# Repositories #

  * They act as an abstraction layer between the services and the DAL (data access layer).
  * They communicate directly with the database and
  * encapsulate the logic required to access the database.
  * If database backend needs to be changed, only change here

  * By adopting this separation, we achieve
    - more maintainability and scalability, making it easier to modify the database or
    - switch to a different database.

  * We can think of them as recipes that our chefs (services) refer to when needed.
    * They don't contain actual ingredients (data in the database),
    * but instructions (queries) on how to get and
    * combine the ingredients to prepare some dishes.
    * They encapsulate the logic required to access the pantry (database).




# 🚀 Express TypeScript Boilerplate 2024

[![Build](https://github.com/edwinhern/express-typescript-2024/actions/workflows/build.yml/badge.svg)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/build.yml)
[![Test](https://github.com/edwinhern/express-typescript-2024/actions/workflows/test.yml/badge.svg)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/test.yml)
[![Code Quality](https://github.com/edwinhern/express-typescript-2024/actions/workflows/code-quality.yml/badge.svg)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/code-quality.yml)
[![Docker Image CI](https://github.com/edwinhern/express-typescript-2024/actions/workflows/docker-image.yml/badge.svg)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/docker-image.yml)

``` code
Hey There! 🙌 
🤾 that ⭐️ button if you like this boilerplate. 
```

## 🌟 Introduction

Welcome to the Express TypeScript Boilerplate 2024 – a streamlined, efficient, and scalable foundation for building powerful backend services with modern tools and practices in Express.js and TypeScript.

## 💡 Motivation

This boilerplate aims to:

- ✨ Reduce setup time for new projects
- 📊 Ensure code consistency and quality
- ⚡  Facilitate rapid development
- 🛡️ Encourage best practices in security, testing, and performance

## 🚀 Features

- 📁 Modular Structure: Organized by feature for easy navigation and scalability
- 💨 Faster Execution with tsx: Rapid TypeScript execution with `tsx` and type checking with `tsc`
- 🌐 Stable Node Environment: Latest LTS Node version in `.nvmrc`
- 🔧 Simplified Environment Variables: Managed with Envalid
- 🔗 Path Aliases: Cleaner code with shortcut imports
- 🔄 Renovate Integration: Automatic updates for dependencies
- 🔒 Security: Helmet for HTTP header security and CORS setup
- 📊 Logging: Efficient logging with `pino-http`
- 🧪 Comprehensive Testing: Setup with Vitest and Supertest
- 🔑 Code Quality Assurance: Husky and lint-staged for consistent quality
- ✅ Unified Code Style: `Biomejs` for consistent coding standards
- 📃 API Response Standardization: `ServiceResponse` class for consistent API responses
- 🐳 Docker Support: Ready for containerization and deployment
- 📝 Input Validation with Zod: Strongly typed request validation using `Zod`
- 🧩 Swagger UI: Interactive API documentation generated from Zod schemas

## 🛠️ Getting Started

### Video Demo

For a visual guide, watch the [video demo](https://github.com/user-attachments/assets/b1698dac-d582-45a0-8d61-31131732b74e) to see the setup and running of the project.

### Step-by-Step Guide

#### Step 1: 🚀 Initial Setup

- Clone the repository: `git clone https://github.com/edwinhern/express-typescript-2024.git`
- Navigate: `cd express-typescript-2024`
- Install dependencies: `npm ci`

#### Step 2: ⚙️ Environment Configuration

- Create `.env`: Copy `.env.template` to `.env`
- Update `.env`: Fill in necessary environment variables

#### Step 3: 🏃‍♂️ Running the Project

- Development Mode: `npm run dev`
- Building: `npm run build`
- Production Mode: Set `.env` to `NODE_ENV="production"` then `npm run build && npm run start`

## 🤝 Feedback and Contributions

We'd love to hear your feedback and suggestions for further improvements. Feel free to contribute and join us in making backend development cleaner and faster!

🎉 Happy coding!
