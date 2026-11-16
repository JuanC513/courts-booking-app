import { Router } from "express";
import * as courtController from "./courts.controller.js";

export const courtsRouter = Router();
courtsRouter.get("/", courtController.list);
courtsRouter.get("/:id", courtController.getById);
courtsRouter.post("/", courtController.create);
courtsRouter.put("/:id", courtController.replace);
courtsRouter.delete("/:id", courtController.remove);
