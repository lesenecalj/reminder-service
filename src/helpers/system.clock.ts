import { Clock } from "../types";

export class SystemClock implements Clock { now() { return new Date() } };