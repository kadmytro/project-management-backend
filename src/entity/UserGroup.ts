import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity({ name: "UserGroupSet" })
export class UserGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToMany(() => User, (user) => user.groups)
  @JoinTable({ name: "user_group_links" })
  users!: User[];

  @CreateDateColumn()
  createdOn!: Date;

  @UpdateDateColumn()
  updatedOn!: Date;

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      users: this.users?.map((u) => u.getDetails()),
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
    };
  }
}
