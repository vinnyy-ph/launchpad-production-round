-- CreateTable
CREATE TABLE "employee_addresses" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_emergency_contacts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- Preserve existing flat address data as the street/address line.
INSERT INTO "employee_addresses" ("id", "employeeId", "address", "createdAt", "updatedAt")
SELECT 'employee-address-' || "id", "id", "address", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "employees"
WHERE "address" IS NOT NULL;

-- Preserve existing emergency contacts. Existing values commonly use "Name, Number",
-- so the first comma separates the name from the remaining contact number text.
INSERT INTO "employee_emergency_contacts" (
    "id",
    "employeeId",
    "emergencyContactName",
    "emergencyContactNumber",
    "createdAt",
    "updatedAt"
)
SELECT
    'employee-emergency-contact-' || "id",
    "id",
    NULLIF(BTRIM(SPLIT_PART("emergencyContact", ',', 1)), ''),
    CASE
        WHEN POSITION(',' IN "emergencyContact") > 0
        THEN NULLIF(BTRIM(SUBSTRING("emergencyContact" FROM POSITION(',' IN "emergencyContact") + 1)), '')
        ELSE NULL
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "employees"
WHERE "emergencyContact" IS NOT NULL;

-- Drop legacy flat profile columns after backfill.
ALTER TABLE "employees" DROP COLUMN "address";
ALTER TABLE "employees" DROP COLUMN "emergencyContact";

-- CreateIndex
CREATE UNIQUE INDEX "employee_addresses_employeeId_key" ON "employee_addresses"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_emergency_contacts_employeeId_key" ON "employee_emergency_contacts"("employeeId");

-- AddForeignKey
ALTER TABLE "employee_addresses" ADD CONSTRAINT "employee_addresses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
