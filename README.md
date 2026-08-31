# PropIntel: AI-Driven Property Intelligence Ledger

PropIntel is an enterprise-grade Property Management Ledger that leverages Generative AI (Google Gemini 3.7 Flash) to transform unstructured property documents (Lease Deeds, Insurance Policies, Municipality Tax Receipts, Encumbrance Certificates) into structured, real-time financial cash flow projections and compliance alerts.

Unlike simple "Chat with PDF" wrappers, PropIntel applies strict domain-specific business logic to AI extraction, featuring manual role assignment, human-in-the-loop verification, and dynamic month-by-month financial forecasting.

---

## 🚀 Key Features

* **Human-in-the-Loop AI Extraction:** Upload scanned PDFs/images of property documents. The Gemini Vision LLM strictly extracts financial metrics into a verified JSON schema, presenting them for human approval before database insertion to ensure zero-hallucination data entry.
* **Dynamic Role-Based Cashflow:** When creating a property record, users define the status as "Owned" or "Rented", automatically assigning the exact financial role (Lessor or Lessee). This accurately dictates whether the extracted rent acts as a positive inflow or a negative outflow in the ledger.
* **Month-by-Month FY Cashflow Projections:** A dynamic Recharts dashboard that projects the Indian Financial Year (April - March). It automatically calculates compound step-up rent escalations mid-year and deducts statutory liabilities (Insurance, Municipality Tax) as exact lump-sum outflows in their respective due months.
* **Compliance Tracking:** Automatically flags overdue Municipality Taxes based on the current financial year and tracks Trade License and Insurance expirations.
* **Cascade Data Management:** Smart deletion logic that safely removes physical files from Supabase Storage while automatically nullifying the exact correlated parent fields in the PostgreSQL database.

---

## 🛠️ Tech Stack

* **Frontend:** React / Next.js, Tailwind CSS, Lucide Icons, Recharts (Data Visualization)
* **Backend:** Express & Serverless API Routes (Node.js runtime)
* **Database & Storage:** Supabase (PostgreSQL), Supabase Storage
* **AI Integration:** Google Gemini API (`@google/genai` with `gemini-3.7-flash`)

---

## 📦 Database Architecture

PropIntel relies on a relational PostgreSQL database. Execute the following SQL in your Supabase SQL Editor to generate the schema:

```sql
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  property_code text NOT NULL UNIQUE,
  location text,
  state text,
  lease_valid_upto date,
  carpet_area text,
  total_rent numeric,
  rent_per_sq_ft numeric,
  lessee text,
  lessor text,
  trade_license_validity date,
  insurance_validity date,
  sum_insured numeric,
  document_image_url text,
  escalation_percentage numeric,
  revision_period_years integer,
  lease_start_date date,
  property_title text NOT NULL,
  policy_no text,
  premium_amount numeric,
  holding_number text,
  latest_tax_financial_year text,
  latest_tax_amount numeric,
  owner_role text NOT NULL DEFAULT 'Lessor'::text CHECK (owner_role = ANY (ARRAY['Lessor'::text, 'Lessee'::text])),
  CONSTRAINT properties_pkey PRIMARY KEY (id)
);

CREATE TABLE public.property_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  property_code text,
  document_type text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_documents_pkey PRIMARY KEY (id),
  CONSTRAINT property_documents_property_code_fkey FOREIGN KEY (property_code) REFERENCES public.properties(property_code)
);
```

---

## ⚙️ Setup & Local Development

### 1. Clone the repository:
```bash
git clone https://github.com/kalyanlahkar/PropIntel.git
cd PropIntel
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Supabase Storage Setup:
1. In your Supabase Dashboard, create a new storage bucket named exactly: `property-documents`.
2. Ensure the bucket policies allow authenticated/public users to upload, read, and delete files.

### 4. Environment Variables:
Create a `.env` or `.env.local` file in the root directory and add the following keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 5. Run the development server:
```bash
npm run dev
```

Navigate to `http://localhost:3000` to view the application in development mode.

---

## 🚀 Running a Local Production Server

To test the application exactly as it would run in a live production environment (with optimized assets and strict routing), you can build and start a local production server:

### 1. Build the application:
```bash
npm run build
```
*Note: Ensure your environment variables are configured before building.*

### 2. Start the production server:
```bash
npm run start
```

Navigate to `http://localhost:3000`. The app will run using the optimized Node.js production runtime.

> **Important:** If you are processing large PDFs, ensure your local Node.js environment has sufficient memory available, as PDF-to-Base64 buffer conversions are memory-intensive.

---

*Built as a showcase for Generative AI integration in Real Estate Product Management.*
