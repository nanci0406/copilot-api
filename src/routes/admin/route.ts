import { Hono } from "hono"

import { adminApiRoutes } from "./api-routes"
import { adminAccessMiddleware } from "./middleware"
import { adminUiRoutes } from "./ui-route"

export const adminRoutes = new Hono()

adminRoutes.use("*", adminAccessMiddleware)

adminRoutes.route("/", adminApiRoutes)
adminRoutes.route("/", adminUiRoutes)
