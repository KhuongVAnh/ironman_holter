DROP TABLE IF EXISTS `medical_histories`;

CREATE TABLE `medical_visits` (
    `visit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `doctor_id` INTEGER NULL,
    `facility` VARCHAR(255) NULL,
    `doctor_name` VARCHAR(255) NULL,
    `visit_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diagnosis` VARCHAR(255) NOT NULL,
    `reason` TEXT NULL,
    `diagnosis_details` TEXT NULL,
    `tests` JSON NULL,
    `prescription` JSON NULL,
    `advice` TEXT NULL,
    `appointment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `medical_visits_user_id_visit_date_idx`(`user_id`, `visit_date`),
    INDEX `medical_visits_doctor_id_idx`(`doctor_id`),
    PRIMARY KEY (`visit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medication_plans` (
    `plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `doctor_id` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `medication_plans_user_id_is_active_start_date_idx`(`user_id`, `is_active`, `start_date`),
    INDEX `medication_plans_doctor_id_idx`(`doctor_id`),
    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medications` (
    `medication_id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `dosage` VARCHAR(191) NOT NULL,
    `times` JSON NOT NULL,
    `type` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`medication_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `medical_visits` ADD CONSTRAINT `medical_visits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `medical_visits` ADD CONSTRAINT `medical_visits_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `medication_plans` ADD CONSTRAINT `medication_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `medication_plans` ADD CONSTRAINT `medication_plans_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `medications` ADD CONSTRAINT `medications_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `medication_plans`(`plan_id`) ON DELETE CASCADE ON UPDATE CASCADE;
