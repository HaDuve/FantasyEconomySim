CREATE TABLE "global_ticks" (
	"tick_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
