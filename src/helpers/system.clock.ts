import { Clock } from "../lib/types";

export class SystemClock implements Clock { now() { return new Date() } };