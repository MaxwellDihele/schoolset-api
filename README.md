# SchoolSet API

Server side API for SchoolSet.

## Architecture

Flutter communicates with this API over HTTPS. This API communicates with Supabase using the server side service role key.

Flutter must never contain the Supabase service role key.

## Endpoints

GET /api/v1/health

POST /api/v1/license/activate

POST /api/v1/license/validate

## Environment variables

Set these in Vercel:

SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY

The service role key must never be committed to GitHub or shipped inside Flutter.

## Local development

Install dependencies, then run:

npm run dev

## Build verification

npm run typecheck

The Vercel deployment should use the repository root and the default Node.js runtime.
