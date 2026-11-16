import { Router } from "express";
import * as userController from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", userController.list);
usersRouter.get("/:id", userController.getById);
usersRouter.post("/", userController.create);
usersRouter.put("/:id", userController.replace);
usersRouter.delete("/:id", userController.remove);
