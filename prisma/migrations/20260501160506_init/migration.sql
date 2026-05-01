-- CreateTable
CREATE TABLE `Experiment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `sourcefile` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Experiment_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperimentData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `strain` DECIMAL(65, 30) NOT NULL,
    `stress` DECIMAL(65, 30) NOT NULL,
    `experimentId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExperimentData` ADD CONSTRAINT `ExperimentData_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
