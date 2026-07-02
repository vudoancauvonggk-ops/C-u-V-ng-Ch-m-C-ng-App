CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"schedule_id" text,
	"teacher_id" text NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"session" text NOT NULL,
	"check_in_time" text NOT NULL,
	"periods" integer DEFAULT 1 NOT NULL,
	"lat" double precision DEFAULT 0 NOT NULL,
	"lng" double precision DEFAULT 0 NOT NULL,
	"distance_meter" double precision DEFAULT 0 NOT NULL,
	"selfie_image" text DEFAULT '',
	"verification_method" text DEFAULT 'GPS' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text DEFAULT '',
	"confirmed_by_admin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"timestamp" text NOT NULL,
	"details" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"request_type" text NOT NULL,
	"date" text NOT NULL,
	"session" text NOT NULL,
	"original_teacher_id" text NOT NULL,
	"target_teacher_id" text,
	"target_schedule_id" text,
	"reason" text DEFAULT '',
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL,
	"admin_notes" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"school_id" text NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL,
	"standard_periods" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"day_of_week" integer NOT NULL,
	"session" text NOT NULL,
	"teacher_id" text NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"periods" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '',
	"contact_person" text DEFAULT '',
	"phone" text DEFAULT '',
	"lat" double precision DEFAULT 0 NOT NULL,
	"lng" double precision DEFAULT 0 NOT NULL,
	"qr_code_data" text DEFAULT '',
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"timestamp" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"target_teacher_id" text
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"dob" text DEFAULT '',
	"phone" text DEFAULT '',
	"email" text DEFAULT '',
	"address" text DEFAULT '',
	"status" text DEFAULT 'active' NOT NULL,
	"hourly_rate" integer DEFAULT 50000 NOT NULL,
	"monthly_allowance" integer DEFAULT 0 NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"deduction" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '',
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"teacher_id" text,
	"permissions" text DEFAULT '[]' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_original_teacher_id_teachers_id_fk" FOREIGN KEY ("original_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;