import { Clock } from "../lib/types/clock";

export class SystemClock implements Clock { now() { return new Date() } };