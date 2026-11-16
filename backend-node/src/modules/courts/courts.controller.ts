import { validateCourtInput } from "./courts.validation.js";
import type { Request, Response } from "express";
import { parseId } from "../../validation/parse-id.js";
import * as courtService from "./courts.service.js";

export async function list(_req: Request, res: Response) {
  const courts = await courtService.listCourts();
  res.json(courts);
}

export async function getById(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  const court = await courtService.getCourt(id);
  res.json(court);
}

export async function create(req: Request, res: Response) {
  const input = validateCourtInput(req.body);
  const court = await courtService.createCourt(input);

  res.status(201).location(`/courts/${court.id}`).json(court);
}

export async function replace(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  const input = validateCourtInput(req.body);
  const court = await courtService.replaceCourt(id, input);
  res.json(court);
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  await courtService.deleteCourt(id);
  res.status(204).end();
}
