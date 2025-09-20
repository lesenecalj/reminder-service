import { Reminder } from "../../entities/reminder.entity";

export interface Clock { now(): Date };
export interface Schedulable extends Reminder {
  id: string;
  at: Date;
}
