-- CreateTable
CREATE TABLE `Provider` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('VPS_PROVIDER', 'SOCKS5_PROVIDER', 'MIXED') NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactMethod` VARCHAR(191) NULL,
    `billingUrl` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VpsAsset` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `hostname` VARCHAR(191) NULL,
    `sshPort` INTEGER NOT NULL DEFAULT 22,
    `sshUsername` VARCHAR(191) NULL,
    `encryptedSecret` VARCHAR(191) NULL,
    `providerId` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `asn` VARCHAR(191) NULL,
    `asOrganization` VARCHAR(191) NULL,
    `isp` VARCHAR(191) NULL,
    `status` ENUM('UNKNOWN', 'ONLINE', 'OFFLINE', 'DEGRADED', 'EXPIRED', 'SUSPENDED', 'IDLE', 'ASSIGNED') NOT NULL DEFAULT 'UNKNOWN',
    `purchaseDate` DATETIME(3) NULL,
    `activatedAt` DATETIME(3) NULL,
    `serviceStartedAt` DATETIME(3) NULL,
    `expireDate` DATETIME(3) NULL,
    `costAmount` DECIMAL(10, 2) NULL,
    `costCurrency` VARCHAR(191) NULL DEFAULT 'USD',
    `saleAmount` DECIMAL(10, 2) NULL,
    `saleCurrency` VARCHAR(191) NULL DEFAULT 'CNY',
    `lastTrafficResetAt` DATETIME(3) NULL,
    `hasThreeXui` BOOLEAN NOT NULL DEFAULT false,
    `threeXuiEnabled` BOOLEAN NOT NULL DEFAULT false,
    `threeXuiAutoSyncEnabled` BOOLEAN NOT NULL DEFAULT false,
    `threeXuiSyncIntervalMinutes` INTEGER NOT NULL DEFAULT 5,
    `threeXuiUrl` VARCHAR(191) NULL,
    `threeXuiPanelPort` INTEGER NULL,
    `threeXuiPanelPath` VARCHAR(191) NULL,
    `threeXuiUsername` VARCHAR(191) NULL,
    `threeXuiPasswordSecret` VARCHAR(191) NULL,
    `threeXuiWebBasePath` VARCHAR(191) NULL,
    `threeXuiPort` INTEGER NULL,
    `threeXuiSecretMasked` VARCHAR(191) NULL,
    `threeXuiSyncXrayStatus` BOOLEAN NOT NULL DEFAULT false,
    `threeXuiSyncUserTraffic` BOOLEAN NOT NULL DEFAULT false,
    `threeXuiLastSyncAt` DATETIME(3) NULL,
    `threeXuiLastSyncStatus` VARCHAR(191) NULL,
    `threeXuiLastSyncError` TEXT NULL,
    `threeXuiLastLatencyMs` INTEGER NULL,
    `threeXuiSessionValidUntil` DATETIME(3) NULL,
    `threeXuiDetectedApiPath` VARCHAR(191) NULL,
    `threeXuiDetectedLoginPath` VARCHAR(191) NULL,
    `threeXuiLastDiagnostics` JSON NULL,
    `threeXuiPanelStatus` VARCHAR(191) NULL,
    `xrayStatus` VARCHAR(191) NULL,
    `panelCpuPercent` DOUBLE NULL,
    `panelMemoryUsedMb` DOUBLE NULL,
    `panelMemoryTotalMb` DOUBLE NULL,
    `panelDiskUsedGb` DOUBLE NULL,
    `panelDiskTotalGb` DOUBLE NULL,
    `panelSwapUsedMb` DOUBLE NULL,
    `panelSwapTotalMb` DOUBLE NULL,
    `panelUptimeText` VARCHAR(191) NULL,
    `panelSystemLoadText` VARCHAR(191) NULL,
    `panelUploadSpeedText` VARCHAR(191) NULL,
    `panelDownloadSpeedText` VARCHAR(191) NULL,
    `panelTotalUploadGb` DOUBLE NULL,
    `panelTotalDownloadGb` DOUBLE NULL,
    `panelConnections` INTEGER NULL,
    `xrayVersion` VARCHAR(191) NULL,
    `threeXuiVersion` VARCHAR(191) NULL,
    `assignedCustomerId` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `osName` VARCHAR(191) NULL,
    `cpuCores` INTEGER NULL,
    `memoryMb` INTEGER NULL,
    `diskGb` INTEGER NULL,
    `bandwidthMbps` INTEGER NULL,
    `trafficTotalGb` DOUBLE NULL,
    `trafficUsedGb` DOUBLE NULL,
    `trafficRemainingGb` DOUBLE NULL,
    `trafficUpdatedAt` DATETIME(3) NULL,
    `trafficSyncMode` ENUM('DISABLED', 'MANUAL', 'RELAY_NODE', 'PROVIDER_API') NOT NULL DEFAULT 'DISABLED',
    `autoTrafficSyncEnabled` BOOLEAN NOT NULL DEFAULT false,
    `autoTrafficSyncIntervalMinutes` INTEGER NULL,
    `autoTrafficSyncLastRunAt` DATETIME(3) NULL,
    `autoTrafficSyncNextRunAt` DATETIME(3) NULL,
    `autoTrafficSyncStatus` VARCHAR(191) NULL,
    `autoTrafficSyncError` TEXT NULL,
    `lastStartedAt` DATETIME(3) NULL,
    `lastRestartedAt` DATETIME(3) NULL,
    `uptimeHours` DOUBLE NULL,
    `monitoringMode` ENUM('DISABLED', 'SSH_SYSTEM', 'THREE_X_UI', 'CUSTOM_AGENT') NOT NULL DEFAULT 'DISABLED',
    `allocationMode` ENUM('EXCLUSIVE', 'SHARED') NOT NULL DEFAULT 'SHARED',
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VpsAsset_providerId_idx`(`providerId`),
    INDEX `VpsAsset_assignedCustomerId_idx`(`assignedCustomerId`),
    INDEX `VpsAsset_status_idx`(`status`),
    INDEX `VpsAsset_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Socks5Asset` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `username` VARCHAR(191) NULL,
    `encryptedSecret` VARCHAR(191) NULL,
    `providerId` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `asn` VARCHAR(191) NULL,
    `asOrganization` VARCHAR(191) NULL,
    `isp` VARCHAR(191) NULL,
    `status` ENUM('UNKNOWN', 'ONLINE', 'OFFLINE', 'DEGRADED', 'EXPIRED', 'SUSPENDED', 'IDLE', 'ASSIGNED') NOT NULL DEFAULT 'UNKNOWN',
    `purchaseDate` DATETIME(3) NULL,
    `activatedAt` DATETIME(3) NULL,
    `serviceStartedAt` DATETIME(3) NULL,
    `expireDate` DATETIME(3) NULL,
    `costAmount` DECIMAL(10, 2) NULL,
    `costCurrency` VARCHAR(191) NULL DEFAULT 'USD',
    `saleAmount` DECIMAL(10, 2) NULL,
    `saleCurrency` VARCHAR(191) NULL DEFAULT 'CNY',
    `lastTrafficResetAt` DATETIME(3) NULL,
    `supportsUdp` BOOLEAN NOT NULL DEFAULT false,
    `relayVpsId` VARCHAR(191) NULL,
    `assignedCustomerId` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `trafficTotalGb` DOUBLE NULL,
    `trafficUsedGb` DOUBLE NULL,
    `trafficRemainingGb` DOUBLE NULL,
    `trafficUpdatedAt` DATETIME(3) NULL,
    `autoTrafficSyncEnabled` BOOLEAN NOT NULL DEFAULT false,
    `autoTrafficSyncIntervalMinutes` INTEGER NULL,
    `autoTrafficSyncLastRunAt` DATETIME(3) NULL,
    `autoTrafficSyncNextRunAt` DATETIME(3) NULL,
    `autoTrafficSyncStatus` VARCHAR(191) NULL,
    `autoTrafficSyncError` TEXT NULL,
    `outboundIp` VARCHAR(191) NULL,
    `authType` VARCHAR(191) NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `lastMonitoringStatus` VARCHAR(191) NULL,
    `lastMonitoringError` TEXT NULL,
    `lastStartedAt` DATETIME(3) NULL,
    `uptimeHours` DOUBLE NULL,
    `allocationMode` ENUM('EXCLUSIVE', 'SHARED') NOT NULL DEFAULT 'EXCLUSIVE',
    `usesRelayVps` BOOLEAN NOT NULL DEFAULT false,
    `relayMode` ENUM('DIRECT', 'VPS_RELAY', 'CHAIN_PROXY') NULL,
    `relayServiceType` ENUM('UNKNOWN', 'THREE_X_UI', 'GOST', 'SING_BOX', 'THREE_PROXY', 'XRAY', 'CUSTOM') NULL,
    `relayListenHost` VARCHAR(191) NULL,
    `relayListenPort` INTEGER NULL,
    `relayProtocol` VARCHAR(191) NULL,
    `relayTag` VARCHAR(191) NULL,
    `relayThreeXuiInboundId` VARCHAR(191) NULL,
    `relayThreeXuiInboundRemark` VARCHAR(191) NULL,
    `relayThreeXuiClientEmail` VARCHAR(191) NULL,
    `relayThreeXuiClientId` VARCHAR(191) NULL,
    `relayThreeXuiOutboundTag` VARCHAR(191) NULL,
    `relayThreeXuiClientStatus` VARCHAR(191) NULL,
    `relayThreeXuiClientExpiryAt` DATETIME(3) NULL,
    `trafficSyncMode` ENUM('DISABLED', 'MANUAL', 'RELAY_NODE', 'PROVIDER_API') NOT NULL DEFAULT 'DISABLED',
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Socks5Asset_providerId_idx`(`providerId`),
    INDEX `Socks5Asset_relayVpsId_idx`(`relayVpsId`),
    INDEX `Socks5Asset_assignedCustomerId_idx`(`assignedCustomerId`),
    INDEX `Socks5Asset_status_idx`(`status`),
    INDEX `Socks5Asset_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assignment` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `assetType` ENUM('VPS', 'SOCKS5') NOT NULL,
    `vpsAssetId` VARCHAR(191) NULL,
    `socks5AssetId` VARCHAR(191) NULL,
    `usageStartDate` DATETIME(3) NULL,
    `customerExpireDate` DATETIME(3) NULL,
    `actualEndDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'ENDED', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'REPLACED') NOT NULL DEFAULT 'ACTIVE',
    `notes` VARCHAR(191) NULL,
    `deliveryMethod` VARCHAR(191) NULL,
    `deliveryHost` VARCHAR(191) NULL,
    `deliveryPort` INTEGER NULL,
    `deliveryUsername` VARCHAR(191) NULL,
    `deliveryPasswordMasked` VARCHAR(191) NULL,
    `deliveryLink` VARCHAR(191) NULL,
    `servicePlanName` VARCHAR(191) NULL,
    `customerPriceAmount` DECIMAL(10, 2) NULL,
    `customerPriceCurrency` VARCHAR(191) NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Assignment_customerId_idx`(`customerId`),
    INDEX `Assignment_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `Assignment_socks5AssetId_idx`(`socks5AssetId`),
    INDEX `Assignment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthCheckLog` (
    `id` VARCHAR(191) NOT NULL,
    `assetType` ENUM('VPS', 'SOCKS5') NOT NULL,
    `vpsAssetId` VARCHAR(191) NULL,
    `socks5AssetId` VARCHAR(191) NULL,
    `checkType` ENUM('TCP', 'SOCKS5_AUTH', 'HTTP_OUTBOUND', 'DNS', 'UDP', 'PING', 'SSH', 'THREE_X_UI') NOT NULL,
    `status` ENUM('SUCCESS', 'FAILED', 'TIMEOUT', 'UNKNOWN') NOT NULL,
    `latencyMs` INTEGER NULL,
    `message` VARCHAR(191) NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HealthCheckLog_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `HealthCheckLog_socks5AssetId_idx`(`socks5AssetId`),
    INDEX `HealthCheckLog_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IpIntelligence` (
    `id` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `asn` VARCHAR(191) NULL,
    `asOrganization` VARCHAR(191) NULL,
    `isp` VARCHAR(191) NULL,
    `networkType` ENUM('UNKNOWN', 'DATACENTER', 'RESIDENTIAL', 'MOBILE', 'ISP', 'PROXY', 'VPN') NOT NULL DEFAULT 'UNKNOWN',
    `isDatacenter` BOOLEAN NOT NULL DEFAULT false,
    `isResidentialLike` BOOLEAN NOT NULL DEFAULT false,
    `isMobileLike` BOOLEAN NOT NULL DEFAULT false,
    `isProxyLike` BOOLEAN NOT NULL DEFAULT false,
    `isVpnLike` BOOLEAN NOT NULL DEFAULT false,
    `internalRiskScore` INTEGER NOT NULL DEFAULT 0,
    `riskLevel` ENUM('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'UNKNOWN',
    `lastCheckedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IpIntelligence_ip_key`(`ip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reminder` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `assetType` ENUM('VPS', 'SOCKS5') NULL,
    `vpsAssetId` VARCHAR(191) NULL,
    `socks5AssetId` VARCHAR(191) NULL,
    `reminderType` ENUM('VPS_EXPIRATION', 'SOCKS5_EXPIRATION', 'CUSTOMER_EXPIRATION', 'HEALTH_FAILURE', 'MANUAL') NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'DONE', 'IGNORED') NOT NULL DEFAULT 'PENDING',
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `success` BOOLEAN NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginAuditLog_username_idx`(`username`),
    INDEX `LoginAuditLog_ip_idx`(`ip`),
    INDEX `LoginAuditLog_success_idx`(`success`),
    INDEX `LoginAuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstallTask` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `installType` VARCHAR(191) NOT NULL,
    `installUrl` VARCHAR(191) NULL,
    `installCommand` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `outputLog` TEXT NULL,
    `parsedResult` JSON NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstallTask_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `InstallTask_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RenewalLog` (
    `id` VARCHAR(191) NOT NULL,
    `renewalType` ENUM('RESOURCE_RENEWAL', 'CUSTOMER_RENEWAL') NOT NULL DEFAULT 'RESOURCE_RENEWAL',
    `assetType` ENUM('VPS', 'SOCKS5') NULL,
    `vpsAssetId` VARCHAR(191) NULL,
    `socks5AssetId` VARCHAR(191) NULL,
    `assignmentId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `oldExpireDate` DATETIME(3) NULL,
    `newExpireDate` DATETIME(3) NOT NULL,
    `addedDays` INTEGER NOT NULL,
    `addedLabel` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RenewalLog_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `RenewalLog_socks5AssetId_idx`(`socks5AssetId`),
    INDEX `RenewalLog_assignmentId_idx`(`assignmentId`),
    INDEX `RenewalLog_customerId_idx`(`customerId`),
    INDEX `RenewalLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RuntimeMetricSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `assetType` ENUM('VPS', 'SOCKS5') NOT NULL,
    `vpsAssetId` VARCHAR(191) NULL,
    `socks5AssetId` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,
    `cpuUsagePercent` DOUBLE NULL,
    `cpuCores` INTEGER NULL,
    `memoryUsedMb` DOUBLE NULL,
    `memoryTotalMb` DOUBLE NULL,
    `memoryUsagePercent` DOUBLE NULL,
    `swapUsedMb` DOUBLE NULL,
    `swapTotalMb` DOUBLE NULL,
    `swapUsagePercent` DOUBLE NULL,
    `diskUsedGb` DOUBLE NULL,
    `diskTotalGb` DOUBLE NULL,
    `diskUsagePercent` DOUBLE NULL,
    `uploadSpeedKbps` DOUBLE NULL,
    `downloadSpeedKbps` DOUBLE NULL,
    `totalUploadGb` DOUBLE NULL,
    `totalDownloadGb` DOUBLE NULL,
    `tcpConnections` INTEGER NULL,
    `udpConnections` INTEGER NULL,
    `publicIp` VARCHAR(191) NULL,
    `privateIp` VARCHAR(191) NULL,
    `osName` VARCHAR(191) NULL,
    `architecture` VARCHAR(191) NULL,
    `systemUptimeSeconds` DOUBLE NULL,
    `serviceUptimeSeconds` DOUBLE NULL,
    `loadAverage` VARCHAR(191) NULL,
    `rawData` JSON NULL,
    `collectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RuntimeMetricSnapshot_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `RuntimeMetricSnapshot_socks5AssetId_idx`(`socks5AssetId`),
    INDEX `RuntimeMetricSnapshot_collectedAt_idx`(`collectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrafficSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `assetType` ENUM('VPS', 'SOCKS5') NOT NULL,
    `vpsAssetId` VARCHAR(191) NULL,
    `socks5AssetId` VARCHAR(191) NULL,
    `syncMode` ENUM('DISABLED', 'MANUAL', 'RELAY_NODE', 'PROVIDER_API') NOT NULL DEFAULT 'MANUAL',
    `totalGb` DOUBLE NULL,
    `usedGb` DOUBLE NULL,
    `remainingGb` DOUBLE NULL,
    `usagePercent` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `message` VARCHAR(191) NULL,
    `rawData` JSON NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrafficSyncLog_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `TrafficSyncLog_socks5AssetId_idx`(`socks5AssetId`),
    INDEX `TrafficSyncLog_syncedAt_idx`(`syncedAt`),
    INDEX `TrafficSyncLog_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreeXuiSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `latencyMs` INTEGER NULL,
    `message` TEXT NULL,
    `inboundCount` INTEGER NULL,
    `clientCount` INTEGER NULL,
    `totalUploadGb` DOUBLE NULL,
    `totalDownloadGb` DOUBLE NULL,
    `rawOverview` JSON NULL,
    `rawInbounds` JSON NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThreeXuiSyncLog_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `ThreeXuiSyncLog_status_idx`(`status`),
    INDEX `ThreeXuiSyncLog_syncedAt_idx`(`syncedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreeXuiInboundSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `inboundId` VARCHAR(191) NOT NULL,
    `remark` VARCHAR(191) NULL,
    `protocol` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `enable` BOOLEAN NULL,
    `totalUploadGb` DOUBLE NULL,
    `totalDownloadGb` DOUBLE NULL,
    `rawData` JSON NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThreeXuiInboundSnapshot_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `ThreeXuiInboundSnapshot_syncedAt_idx`(`syncedAt`),
    UNIQUE INDEX `ThreeXuiInboundSnapshot_vpsAssetId_inboundId_key`(`vpsAssetId`, `inboundId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreeXuiClientSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `inboundSnapshotId` VARCHAR(191) NOT NULL,
    `inboundId` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NULL,
    `clientRemark` VARCHAR(191) NULL,
    `enable` BOOLEAN NULL,
    `clientStatus` VARCHAR(191) NULL,
    `totalUploadGb` DOUBLE NULL,
    `totalDownloadGb` DOUBLE NULL,
    `uploadBytes` DOUBLE NULL,
    `downloadBytes` DOUBLE NULL,
    `totalTrafficBytes` DOUBLE NULL,
    `totalTrafficGb` DOUBLE NULL,
    `expiryTime` DATETIME(3) NULL,
    `rawData` JSON NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThreeXuiClientSnapshot_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `ThreeXuiClientSnapshot_inboundSnapshotId_idx`(`inboundSnapshotId`),
    INDEX `ThreeXuiClientSnapshot_clientEmail_idx`(`clientEmail`),
    INDEX `ThreeXuiClientSnapshot_syncedAt_idx`(`syncedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreeXuiOutboundSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `protocol` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `rawData` JSON NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThreeXuiOutboundSnapshot_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `ThreeXuiOutboundSnapshot_syncedAt_idx`(`syncedAt`),
    UNIQUE INDEX `ThreeXuiOutboundSnapshot_vpsAssetId_tag_key`(`vpsAssetId`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreeXuiRoutingSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NOT NULL,
    `outboundTag` VARCHAR(191) NOT NULL,
    `rawData` JSON NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThreeXuiRoutingSnapshot_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `ThreeXuiRoutingSnapshot_clientEmail_idx`(`clientEmail`),
    INDEX `ThreeXuiRoutingSnapshot_outboundTag_idx`(`outboundTag`),
    INDEX `ThreeXuiRoutingSnapshot_syncedAt_idx`(`syncedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreeXuiManualImportLog` (
    `id` VARCHAR(191) NOT NULL,
    `vpsAssetId` VARCHAR(191) NOT NULL,
    `importType` VARCHAR(191) NOT NULL,
    `inboundCount` INTEGER NOT NULL DEFAULT 0,
    `clientCount` INTEGER NOT NULL DEFAULT 0,
    `outboundCount` INTEGER NOT NULL DEFAULT 0,
    `routingCount` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `message` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThreeXuiManualImportLog_vpsAssetId_idx`(`vpsAssetId`),
    INDEX `ThreeXuiManualImportLog_importType_idx`(`importType`),
    INDEX `ThreeXuiManualImportLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VpsAsset` ADD CONSTRAINT `VpsAsset_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VpsAsset` ADD CONSTRAINT `VpsAsset_assignedCustomerId_fkey` FOREIGN KEY (`assignedCustomerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Socks5Asset` ADD CONSTRAINT `Socks5Asset_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Socks5Asset` ADD CONSTRAINT `Socks5Asset_relayVpsId_fkey` FOREIGN KEY (`relayVpsId`) REFERENCES `VpsAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Socks5Asset` ADD CONSTRAINT `Socks5Asset_assignedCustomerId_fkey` FOREIGN KEY (`assignedCustomerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_socks5AssetId_fkey` FOREIGN KEY (`socks5AssetId`) REFERENCES `Socks5Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthCheckLog` ADD CONSTRAINT `HealthCheckLog_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthCheckLog` ADD CONSTRAINT `HealthCheckLog_socks5AssetId_fkey` FOREIGN KEY (`socks5AssetId`) REFERENCES `Socks5Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstallTask` ADD CONSTRAINT `InstallTask_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RenewalLog` ADD CONSTRAINT `RenewalLog_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RenewalLog` ADD CONSTRAINT `RenewalLog_socks5AssetId_fkey` FOREIGN KEY (`socks5AssetId`) REFERENCES `Socks5Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RenewalLog` ADD CONSTRAINT `RenewalLog_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RuntimeMetricSnapshot` ADD CONSTRAINT `RuntimeMetricSnapshot_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RuntimeMetricSnapshot` ADD CONSTRAINT `RuntimeMetricSnapshot_socks5AssetId_fkey` FOREIGN KEY (`socks5AssetId`) REFERENCES `Socks5Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrafficSyncLog` ADD CONSTRAINT `TrafficSyncLog_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrafficSyncLog` ADD CONSTRAINT `TrafficSyncLog_socks5AssetId_fkey` FOREIGN KEY (`socks5AssetId`) REFERENCES `Socks5Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiSyncLog` ADD CONSTRAINT `ThreeXuiSyncLog_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiInboundSnapshot` ADD CONSTRAINT `ThreeXuiInboundSnapshot_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiClientSnapshot` ADD CONSTRAINT `ThreeXuiClientSnapshot_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiClientSnapshot` ADD CONSTRAINT `ThreeXuiClientSnapshot_inboundSnapshotId_fkey` FOREIGN KEY (`inboundSnapshotId`) REFERENCES `ThreeXuiInboundSnapshot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiOutboundSnapshot` ADD CONSTRAINT `ThreeXuiOutboundSnapshot_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiRoutingSnapshot` ADD CONSTRAINT `ThreeXuiRoutingSnapshot_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreeXuiManualImportLog` ADD CONSTRAINT `ThreeXuiManualImportLog_vpsAssetId_fkey` FOREIGN KEY (`vpsAssetId`) REFERENCES `VpsAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
