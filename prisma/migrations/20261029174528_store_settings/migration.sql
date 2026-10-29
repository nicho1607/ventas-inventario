-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Mi Tienda',
    "legalId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "receiptFooter" TEXT DEFAULT '¡Gracias por su compra!',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);
