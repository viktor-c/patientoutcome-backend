# Workspace/folder/workflow design
## Routes #
  * a route is a specific endpoint that the application can respond to.
  * It represents a specific URL path and the HTTP method (GET, POST, PUT, DELETE, etc).

  * They are the entry point of our application and
  * determine how the application **responds**
  * to a client request to a particular endpoint.

  * Think of routes as the menu at the restaurant.
  * Each menu item represents a different route that the customer can choose,

## Controllers #
  * Once the route receives a request from a client,
  * it needs to handle that request and send a response back to the client.
  * They are responsible for managing the flow of data between
    * the model (business logic and database) and
    * the view (what the user-end interacts with).
  * We can think of the controller as the **waiter** in a restaurant.
  * The client decides on the item (route) he wants, and
  * the waiter takes the order and communicates it to the kitchen (__services__ and __repositories__).
  * Then, they bring back the prepared food (__response to the customer__).

## Services #
  * They are responsible for the business logic of the application. This is where we define the rules, logic, and calculations.
  * Services communicate with repositories to fetch and manipulate data.

  * In our restaurant analogy, services can be thought of as the chefs in the kitchen.
  * They receive the orders from the waiter (controllers) asked by the clients and
  * then prepare the food (business logic).
  * They might need to consult the recipe (data from the database) before they start cooking.

## Repositories #

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


# Used libraries
  * [z TypeScript-first](https://zod.dev/)
    * schema validation with static type inference
  * zod-mongoose https://github.com/git-zodyac/mongoose
    * to create models from zod schema

# Debug Validation errors
  - check src/common/utils/httpHandlers.ts -> "export const validateRequest"

# Original template
  * [[https://codewithmatt.hashnode.dev/understanding-the-building-blocks-of-a-web-application-routes-controllers-services-repositories-and-databases|Building blocks of a web app]]

  * https://github.com/edwinhern/express-typescript-2024

## Step 3: 🏃‍♂️ Running the Project

- Development Mode: `npm run dev`
- Building: `npm run build`
- Production Mode: Set `.env` to `NODE_ENV="production"` then `npm run build && npm run start`

🎉 Happy coding!
