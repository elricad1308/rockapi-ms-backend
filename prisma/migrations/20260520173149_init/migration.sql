-- CreateTable
CREATE TABLE `Experiment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Experiment_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sample` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `sourcefile` VARCHAR(191) NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `experimentId` INTEGER NOT NULL,
    `epsilon_25` DECIMAL(65, 30) NULL,
    `epsilon_50` DECIMAL(65, 30) NULL,
    `epsilon_max` DECIMAL(65, 30) NULL,
    `epsilon_u` DECIMAL(65, 30) NULL,
    `sigma_25` DECIMAL(65, 30) NULL,
    `sigma_50` DECIMAL(65, 30) NULL,
    `sigma_max` DECIMAL(65, 30) NULL,
    `sigma_u` DECIMAL(65, 30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SampleData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `strain` DECIMAL(65, 30) NOT NULL,
    `stress` DECIMAL(65, 30) NOT NULL,
    `sampleId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sample` ADD CONSTRAINT `Sample_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleData` ADD CONSTRAINT `SampleData_sampleId_fkey` FOREIGN KEY (`sampleId`) REFERENCES `Sample`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
