import fs from "node:fs";
import { at } from "./paths.js";

export type Subtask = {
  id: string;
  title: string;
  description: string;
  author: string;
  estimate: number;
  dependsOn?: string[];
  acceptance?: string;
};
export type Ticket = { id: string; title: string; context: string; subtasks: Subtask[] };

export function loadTicket(id: string): Ticket {
  const file = at("tickets", `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`No existe tickets/${id}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function loadTruth(id: string) {
  const file = at("tickets", `${id}.truth.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

export const short = (id: string) => id.replace(/^.*?(\.\d+)$/, "$1");
