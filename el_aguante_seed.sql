-- =============================================================
--  EL AGUANTE — Popayán, Boulevar Rose
--  Seed SQL Definitivo para iMenu · MySQL 8.0+
--  Menú completo real extraído de menupp.co + PDF + 70 Hotspots
--  Generado: 2026-09-16
--
--  COMO EJECUTAR EN POWERSHELL:
--    Get-Content el_aguante_seed.sql | mysql -u root -p imenu_db
--    O en CMD:
--    mysql -u root -p imenu_db < el_aguante_seed.sql
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

SET @pw_hash = '$2a$10$HZmpX7uOpAyIcBcUP85nZuBidfOoJJbhAl4qQpPT08D7wxuLAgoAe'; -- Aguante2024!
SET @org_id = 'e47dac06-b22d-11f1-9c00-9a51728b478c';
SET @rest_id = 'e47db8bc-b22d-11f1-9c00-9a51728b478c';

-- 1. ORGANIZACIÓN
INSERT INTO organizations (id, name, slug, plan, createdAt, updatedAt)
VALUES (@org_id, 'El Aguante Popayán', 'el-aguante-popayan', 'BASIC', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), updatedAt = NOW();

-- 2. SUSCRIPCIÓN
INSERT INTO subscriptions (id, organizationId, tier, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt)
VALUES (UUID(), @org_id, 'BASIC', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), FALSE, NOW(), NOW())
ON DUPLICATE KEY UPDATE status = 'active', updatedAt = NOW();

-- 3. RESTAURANTE
INSERT INTO restaurants (id, organizationId, slug, name, description, cuisineType, currency, isActive, pdfUrl, createdAt, updatedAt)
VALUES (@rest_id, @org_id, 'el-aguante', 'El Aguante', 'Bar & Restaurante en el Boulevar Rose de Popayán. Hamburguesas artesanales, alitas, platos fuertes y coctelería.', 'Bar & Hamburguesas', 'COP', TRUE, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/menu/menu.pdf', NOW(), NOW())
ON DUPLICATE KEY UPDATE pdfUrl = 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/menu/menu.pdf', description = VALUES(description), updatedAt = NOW();

-- 4. CONFIGURACIÓN FISCAL
INSERT INTO tax_configs (id, restaurantId, country, currency, currencySymbol, vatRate, vatEnabled, serviceChargeRate, serviceChargeEnabled, legalName, address, phone, email, invoicePrefix, nextInvoiceNumber, ticketEnabled, ticketWidth, ticketHeader, ticketFooter, ticketShowLogo, ticketShowTax, ticketShowTable, ticketShowWaiter, updatedAt)
VALUES (UUID(), @rest_id, 'CO', 'COP', '$', 0.19, TRUE, 0.00, FALSE, 'El Aguante S.A.S.', 'Boulevar Rose, Popayán, Cauca', '+57 320 000 0000', 'admin@elaguante.co', 'FA', 1, TRUE, 80, 'EL AGUANTE — Popayán', '¡Gracias por su visita! Vuelve pronto.', TRUE, TRUE, TRUE, TRUE, NOW())
ON DUPLICATE KEY UPDATE legalName = VALUES(legalName), updatedAt = NOW();

-- 5. USUARIOS
INSERT INTO users (id, organizationId, restaurantId, email, passwordHash, name, role, createdAt)
VALUES
  (UUID(), @org_id, @rest_id, 'admin@elaguante.co',    @pw_hash, 'Admin El Aguante',    'RESTAURANT_ADMIN', NOW()),
  (UUID(), @org_id, @rest_id, 'manager@elaguante.co',  @pw_hash, 'Manager El Aguante',  'MANAGER',          NOW()),
  (UUID(), @org_id, @rest_id, 'contador@elaguante.co', @pw_hash, 'Contadora El Aguante','ACCOUNTANT',       NOW()),
  (UUID(), @org_id, @rest_id, 'mesero1@elaguante.co',  @pw_hash, 'Mesero 1 El Aguante', 'WAITER',           NOW()),
  (UUID(), @org_id, @rest_id, 'mesero2@elaguante.co',  @pw_hash, 'Mesero 2 El Aguante', 'WAITER',           NOW()),
  (UUID(), @org_id, @rest_id, 'cocina@elaguante.co',   @pw_hash, 'Chef El Aguante',     'KITCHEN',          NOW())
ON DUPLICATE KEY UPDATE passwordHash = @pw_hash, restaurantId = @rest_id, organizationId = @org_id;

-- 6. MESAS (10 mesas — 3 zonas)
INSERT IGNORE INTO tables (id, restaurantId, tableNumber, zone, capacity, status, shape, posX, posY, width, height)
VALUES
  (UUID(), @rest_id,  1, 'Salón Principal', 4, 'AVAILABLE', 'square',     0,   0,  80, 80),
  (UUID(), @rest_id,  2, 'Salón Principal', 4, 'AVAILABLE', 'square',   100,   0,  80, 80),
  (UUID(), @rest_id,  3, 'Salón Principal', 4, 'AVAILABLE', 'square',   200,   0,  80, 80),
  (UUID(), @rest_id,  4, 'Salón Principal', 6, 'AVAILABLE', 'rectangle',300,   0, 120, 80),
  (UUID(), @rest_id,  5, 'Terraza',         4, 'AVAILABLE', 'round',      0, 150,  80, 80),
  (UUID(), @rest_id,  6, 'Terraza',         4, 'AVAILABLE', 'round',    100, 150,  80, 80),
  (UUID(), @rest_id,  7, 'Terraza',         4, 'AVAILABLE', 'round',    200, 150,  80, 80),
  (UUID(), @rest_id,  8, 'Terraza',         6, 'AVAILABLE', 'rectangle',300, 150, 120, 80),
  (UUID(), @rest_id,  9, 'Bar',             2, 'AVAILABLE', 'square',     0, 300,  60, 60),
  (UUID(), @rest_id, 10, 'Bar',             2, 'AVAILABLE', 'square',    80, 300,  60, 60);

-- 7. CATEGORÍAS
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dc735-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Entradas', 0, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dc7e5-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Para Comer', 1, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dc879-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Veggis del Aguante', 2, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dc910-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Fuertes del Aguante', 3, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dc9bc-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Para Picar', 4, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dca4c-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Alitas', 5, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dcadc-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Bebidas', 6, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dcd08-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Cocktails', 7, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dcdd8-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Mojitos', 8, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dcf50-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Margaritas', 9, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dd05d-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Gin Tonic', 10, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dd175-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Submarinos', 11, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);
INSERT INTO categories (id, restaurantId, name, orderIndex, isActive) VALUES ('e47dd23d-b22d-11f1-9c00-9a51728b478c', @rest_id, 'Licores', 12, TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name), orderIndex = VALUES(orderIndex);

-- 8. PRODUCTOS, MODIFICADORES, INGREDIENTES Y HOTSPOTS DEL MENÚ PDF
DELETE FROM pdf_hotspots WHERE restaurantId = @rest_id;

-- [Entradas] Papas Molotov
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('19845157-7df8-45d1-aa82-4dde76007120', @rest_id, 'e47dc735-b22d-11f1-9c00-9a51728b478c', 'Papas Molotov', 'Papas rústicas, salsa de queso cheddar, guacamole y pico de gallo.', 18900, TRUE, 0, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/01_papas_molotov.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('9f73c351-dad5-4ffd-a77e-bcdd7a60545f', '19845157-7df8-45d1-aa82-4dde76007120', 'Extras', 'ADDON', FALSE, 0, 3) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('2f8e5ca4-7970-4618-ad22-34fb6c417fc8', '9f73c351-dad5-4ffd-a77e-bcdd7a60545f', 'Extra Guacamole', 2500, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('390243e0-b19c-4330-b0fd-411390d8f7bb', '9f73c351-dad5-4ffd-a77e-bcdd7a60545f', 'Extra Cheddar', 3000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('70fc265b-f8a2-4796-82a2-ed1acf487ae3', '9f73c351-dad5-4ffd-a77e-bcdd7a60545f', 'Extra Tocineta', 3500, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('02529582-cecd-48f2-86d0-7ee954fe7ee8', '19845157-7df8-45d1-aa82-4dde76007120', 'Pico de gallo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('314590bd-5bb6-48ac-b93a-ce22b84dfff5', '19845157-7df8-45d1-aa82-4dde76007120', 'Salsa de queso cheddar', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('82f5e67c-0b05-4df9-bd62-b130362e9f23', '19845157-7df8-45d1-aa82-4dde76007120', 'Guacamole artesanal', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('f8101389-5be1-491c-9650-1de3aaece6fc', '19845157-7df8-45d1-aa82-4dde76007120', 'Papas rústicas', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('83abbf4e-6cec-4810-b7d0-de3ac690a0df', @rest_id, '19845157-7df8-45d1-aa82-4dde76007120', 0, 0.04, 0.35, 0.44, 0.33, NOW(), NOW());

-- [Entradas] Empanadas de Pipián
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e6157dd8-05fb-4a34-a070-d18c4665f32f', @rest_id, 'e47dc735-b22d-11f1-9c00-9a51728b478c', 'Empanadas de Pipián', '10 empanaditas de pipián tradicionales acompañadas con ají de maní casero.', 11900, TRUE, 1, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/02_empanadas_de_pipian.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('92c38b69-7fca-4d18-aa8e-5a07cb0ad709', 'e6157dd8-05fb-4a34-a070-d18c4665f32f', 'Ají de maní', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('bbc441b5-3af3-45a4-9258-11345d3c7bd8', @rest_id, 'e6157dd8-05fb-4a34-a070-d18c4665f32f', 0, 0.52, 0.35, 0.44, 0.33, NOW(), NOW());

-- [Entradas] Papas Chicago
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('de92ff7c-2987-41fa-84f4-ab6ddf746dc7', @rest_id, 'e47dc735-b22d-11f1-9c00-9a51728b478c', 'Papas Chicago', 'Papas a la francesa con trocitos de tocineta y tomate con especias, bañadas con queso.', 17900, TRUE, 2, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/03_papas_chicago.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('0f8f9859-c011-4459-a7d6-792017f31d15', 'de92ff7c-2987-41fa-84f4-ab6ddf746dc7', 'Extras', 'ADDON', FALSE, 0, 2) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('0e1e92ed-68da-422f-abe5-f1b70e6705a9', '0f8f9859-c011-4459-a7d6-792017f31d15', 'Queso Fundido', 3000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('9d92d07a-72c7-433a-8ffb-ae6721cb75bf', '0f8f9859-c011-4459-a7d6-792017f31d15', 'Extra Tocineta', 3500, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b61a2739-1812-4f81-a4a5-8034284411fe', 'de92ff7c-2987-41fa-84f4-ab6ddf746dc7', 'Salsa de queso', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b9b60d76-ca6a-4bba-b61d-37461717e260', 'de92ff7c-2987-41fa-84f4-ab6ddf746dc7', 'Tocineta picada', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('efe22fe2-6eb0-4ece-9d1f-a493ec12d25b', 'de92ff7c-2987-41fa-84f4-ab6ddf746dc7', 'Tomate especiado', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('ea0148d2-02be-46f7-97fd-063cf0eb529d', @rest_id, 'de92ff7c-2987-41fa-84f4-ab6ddf746dc7', 1, 0.04, 0.02, 0.44, 0.32, NOW(), NOW());

-- [Entradas] Papas Pork
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('48de9d22-0f08-4d36-8e76-5b4ac00c720a', @rest_id, 'e47dc735-b22d-11f1-9c00-9a51728b478c', 'Papas Pork', 'Papas a la francesa con queso americano, pulled pork en cocción lenta y cebollín.', 20900, TRUE, 3, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/04_papas_pork.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('05266fd1-e248-418c-83c1-4598f800f38c', '48de9d22-0f08-4d36-8e76-5b4ac00c720a', 'Extras', 'ADDON', FALSE, 0, 2) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('09e0cc08-e2a8-4e91-a8fd-ef39be444336', '05266fd1-e248-418c-83c1-4598f800f38c', 'Extra Queso', 3000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('1c0ae96d-abbf-4cec-8e21-ca583ea35d7c', '05266fd1-e248-418c-83c1-4598f800f38c', 'Extra Pulled Pork', 5000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3e1d89be-7944-4e84-8e01-02aa66c77d89', '48de9d22-0f08-4d36-8e76-5b4ac00c720a', 'Queso americano', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('5e5be048-ad98-4a4e-8f17-a949f76401ba', '48de9d22-0f08-4d36-8e76-5b4ac00c720a', 'Cebollín fresco', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('d9be96ea-6914-4adb-bbb3-f64e4912255e', '48de9d22-0f08-4d36-8e76-5b4ac00c720a', 'Pulled pork', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('f73f2c65-a0da-4ed9-80fc-89cd9c37d572', @rest_id, '48de9d22-0f08-4d36-8e76-5b4ac00c720a', 1, 0.52, 0.02, 0.44, 0.32, NOW(), NOW());

-- [Para Comer] Hamburguesa de 125 gr
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('3a56a530-cfd5-42e7-99c6-9ac88a231c73', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa de 125 gr', 'Hamburguesa clásica americana con pan tipo brioche, queso mozzarella, tomate, lechuga y 125 gr de carne de la casa. Acompañada de papas.', 18900, TRUE, 4, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/05_hamburguesa_de_125_gr.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('2f9bff60-dc78-4043-966c-9fe4888762f8', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Adiciones', 'ADDON', FALSE, 0, 4) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('0dcaaf2f-cc95-499d-8019-365594a7eff5', '2f9bff60-dc78-4043-966c-9fe4888762f8', 'Queso cheddar', 2500, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('a4cfbc53-1a4b-458e-b4ae-25a552f26670', '2f9bff60-dc78-4043-966c-9fe4888762f8', 'Tocineta crocante', 3000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('ca6522c5-4ed4-47b4-ac05-14e064228804', '2f9bff60-dc78-4043-966c-9fe4888762f8', 'Cebolla caramelizada', 2000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('eb5c9c2b-1824-4f73-888e-f7c6b7a13550', '2f9bff60-dc78-4043-966c-9fe4888762f8', 'Huevo frito', 2000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('8f9c50be-bcde-4afd-b327-f35d08d79cb0', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('6a67c0f4-1a83-4a39-81fe-b47263d294be', '8f9c50be-bcde-4afd-b327-f35d08d79cb0', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('c187dd7c-4fea-49f2-bdb8-33b8c973ebb9', '8f9c50be-bcde-4afd-b327-f35d08d79cb0', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('bf3acf85-eecb-4b9d-82da-17bd461be954', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('1c944e92-0cfd-4f50-b22a-00dfc6784097', 'bf3acf85-eecb-4b9d-82da-17bd461be954', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('4ac633e0-7264-479e-9fa3-d7f18e23d1fa', 'bf3acf85-eecb-4b9d-82da-17bd461be954', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('91d239c4-76a9-44c8-92be-453ad7d7491b', 'bf3acf85-eecb-4b9d-82da-17bd461be954', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('6ea4aca3-be19-4a43-807e-3409451f13f2', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Tomate', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('84e8968f-4543-479b-ba8e-5a633e1ba9a5', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Salsa de la casa', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9518a679-5245-4228-be9f-76b330bc77b8', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Lechuga', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b10ca82a-97bd-4b37-a16a-5b498dccfcaf', '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 'Queso mozzarella', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('6c9ed216-3174-48eb-acf7-a0b5f71d2ede', @rest_id, '3a56a530-cfd5-42e7-99c6-9ac88a231c73', 1, 0.04, 0.56, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Hamburguesa de 200 gr
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa de 200 gr', 'Hamburguesa de 200 gr clásica americana con pan tipo brioche, queso mozzarella, tomate y lechuga. Acompañada con papas a la francesa.', 25500, TRUE, 5, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/06_hamburguesa_de_200_gr.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('9453475a-2d8b-45ae-8543-78ce5d24e8a8', '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 'Adiciones', 'ADDON', FALSE, 0, 4) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('046f281c-ce0e-4d71-a9f8-09d65b34b34d', '9453475a-2d8b-45ae-8543-78ce5d24e8a8', 'Queso cheddar', 2500, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('b5c6615b-9739-4866-90b5-a721e4115ea3', '9453475a-2d8b-45ae-8543-78ce5d24e8a8', 'Tocineta crocante', 3000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('baa4d6a5-1cd8-490b-98af-797c01d19d88', '9453475a-2d8b-45ae-8543-78ce5d24e8a8', 'Huevo frito', 2000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('9dd27fe9-7907-40e8-98d4-fed803696086', '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e207643f-7986-436c-84f0-4ed76af6e0b9', '9dd27fe9-7907-40e8-98d4-fed803696086', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f0cdefa2-510f-45aa-9250-925bf1d066c1', '9dd27fe9-7907-40e8-98d4-fed803696086', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('a7028667-c8b2-4aec-945d-c23791233ef4', '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('06fa1cb7-dac1-4a53-acb7-ffb8ebba9774', 'a7028667-c8b2-4aec-945d-c23791233ef4', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('289e9194-5dfc-4440-ba8d-9ac69515554a', 'a7028667-c8b2-4aec-945d-c23791233ef4', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('9e62e462-d3ca-43ca-90ad-1ba9c00be157', 'a7028667-c8b2-4aec-945d-c23791233ef4', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('26e399a1-8aa0-4ab9-ba25-dcd6b569d4d9', '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 'Tomate', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('417b6c10-13aa-4217-8d6f-68b3000734b6', '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 'Queso mozzarella', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('e054f329-3988-4989-a79c-bb3c1024f301', '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 'Lechuga', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('8b73834a-8328-4f1f-9d33-965fed96803d', @rest_id, '5949c0de-6d56-4ee0-a0f6-b0538ab2aa9d', 1, 0.04, 0.67, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Hamburguesa El Aguante Grunge
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('81033da9-97e8-432f-bf2d-5753d7288049', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa El Aguante Grunge', 'Hamburguesa doble de 250gr asada, con doble queso mozzarella, tocineta, crunch BBQ, chorizo asado, piña o cebolleta dulce, acompañada de papas.', 37900, TRUE, 6, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/07_hamburguesa_el_aguante_grunge.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('5d52a2c3-4f2f-4a04-9d7d-61d15cf9f08c', '81033da9-97e8-432f-bf2d-5753d7288049', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('54435687-0979-45c6-8877-10835b4b539f', '5d52a2c3-4f2f-4a04-9d7d-61d15cf9f08c', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e0a78855-fc33-476e-a80f-8413a5a92b65', '5d52a2c3-4f2f-4a04-9d7d-61d15cf9f08c', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('98dfcfd0-2d6e-4545-b77f-afdba42baca5', '81033da9-97e8-432f-bf2d-5753d7288049', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('2c141f69-8f8b-4819-bc87-2e91b9d1ef89', '98dfcfd0-2d6e-4545-b77f-afdba42baca5', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('59d5c7d4-1376-4389-ba5d-152caeaaa499', '98dfcfd0-2d6e-4545-b77f-afdba42baca5', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('63c1ff6c-a603-4fc6-ab18-4658644f8e5c', '98dfcfd0-2d6e-4545-b77f-afdba42baca5', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('a7cabd9a-bff3-495a-87bb-8eb96c6fb0a5', '81033da9-97e8-432f-bf2d-5753d7288049', 'Dulce', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('ae8fdf8d-342c-473e-9c93-7303c639e102', 'a7cabd9a-bff3-495a-87bb-8eb96c6fb0a5', 'Con Cebolleta dulce', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('ce975fd5-02d6-4ea2-81ce-cf7992ae3fb0', 'a7cabd9a-bff3-495a-87bb-8eb96c6fb0a5', 'Con Piña dulce', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('19847874-20f4-4621-9670-97db49ca3f0b', '81033da9-97e8-432f-bf2d-5753d7288049', 'Tocineta', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3fcbe754-e519-4e09-bf69-10a484c50284', '81033da9-97e8-432f-bf2d-5753d7288049', 'Doble queso mozzarella', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('bdf3593d-30bc-447c-b3ae-e1f31f17a471', '81033da9-97e8-432f-bf2d-5753d7288049', 'Chorizo asado', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('c383d2a2-fd55-471f-971d-b3ad4ad12882', '81033da9-97e8-432f-bf2d-5753d7288049', 'Piña o cebolleta dulce', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('ef1f26d2-ccc8-4bc5-9429-4b0d95927b3e', '81033da9-97e8-432f-bf2d-5753d7288049', 'Crunch BBQ', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('df977414-5e15-4519-9e25-84ee2b7061e4', @rest_id, '81033da9-97e8-432f-bf2d-5753d7288049', 1, 0.04, 0.77, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Hamburguesa Argentina
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('addea5b0-df19-49bf-9709-76a110596ae0', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa Argentina', 'Hamburguesa de 150gr de carne al estilo argentino, queso mozzarella, acompañado con aros de cebolla con especias, y papas a la francesa.', 27900, TRUE, 7, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/08_hamburguesa_argentina.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('7fa56690-02be-4ba4-84b0-ed3edbccb16a', 'addea5b0-df19-49bf-9709-76a110596ae0', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('31b87bad-f414-4d87-a2c6-08c61bc7a733', '7fa56690-02be-4ba4-84b0-ed3edbccb16a', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('38ba350d-e02f-4779-b2ea-6f7737cdb54a', '7fa56690-02be-4ba4-84b0-ed3edbccb16a', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('f1b60f1e-b329-411a-9a90-868d09ab5826', 'addea5b0-df19-49bf-9709-76a110596ae0', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('0205f456-833a-4a6c-b591-5ee4f747b316', 'f1b60f1e-b329-411a-9a90-868d09ab5826', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('573772f5-3d89-4551-96c0-6023137d5e5c', 'f1b60f1e-b329-411a-9a90-868d09ab5826', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('8bf84adc-67ae-4a3d-8ff3-58148b323f4a', 'f1b60f1e-b329-411a-9a90-868d09ab5826', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('2ed5c00e-a22a-46ef-af25-55182acbcc1f', 'addea5b0-df19-49bf-9709-76a110596ae0', 'Chimichurri argentino', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('69b0a7a2-1d8f-4742-acaf-3dc51e170db5', 'addea5b0-df19-49bf-9709-76a110596ae0', 'Queso mozzarella', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('d8cce244-2cb7-45b7-97d1-a5dfb149f478', 'addea5b0-df19-49bf-9709-76a110596ae0', 'Aros de cebolla', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('3dd164c9-ab4e-46f3-9f2c-90604e707844', @rest_id, 'addea5b0-df19-49bf-9709-76a110596ae0', 1, 0.04, 0.88, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Hamburguesa Jack Fire
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('d5cff495-3922-4ffe-83f7-a1cc95d672d5', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa Jack Fire', 'Hamburguesa de 150 gr de carne de la casa con Jack Daniel''s Fire, tocineta caramelizada y queso cheddar, acompañado de papas a la francesa.', 27900, TRUE, 8, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/09_hamburguesa_jack_fire.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('76f253cf-e52b-4da7-b792-a492ff6ca695', 'd5cff495-3922-4ffe-83f7-a1cc95d672d5', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('c79c35fa-8ce4-4056-b563-c786b99b9cc7', '76f253cf-e52b-4da7-b792-a492ff6ca695', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f4e36fdd-8284-48d2-912a-7ba098277b13', '76f253cf-e52b-4da7-b792-a492ff6ca695', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('c069e037-5678-41d1-9598-0b6c4ea4a3ac', 'd5cff495-3922-4ffe-83f7-a1cc95d672d5', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('6b162caf-2e75-4110-ac95-b5b35dbdbf04', 'c069e037-5678-41d1-9598-0b6c4ea4a3ac', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('70b861ea-6b48-41e2-ad5a-7f774eb60d9e', 'c069e037-5678-41d1-9598-0b6c4ea4a3ac', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('c5a3b7af-f644-426a-b243-99a555e7d595', 'c069e037-5678-41d1-9598-0b6c4ea4a3ac', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('19973ad2-9760-472b-97a5-4ccc46a3d9e8', 'd5cff495-3922-4ffe-83f7-a1cc95d672d5', 'Tocineta caramelizada Jack Fire', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b6c7e5c0-514a-49df-9021-eae4e03c559a', 'd5cff495-3922-4ffe-83f7-a1cc95d672d5', 'Queso cheddar fundido', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('26124cce-f80d-49c4-8c01-7ab89107170d', @rest_id, 'd5cff495-3922-4ffe-83f7-a1cc95d672d5', 2, 0.04, 0.02, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Hamburguesa Dark Honey
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('8085568a-2377-47f8-b3d4-0ae6ca512f5f', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa Dark Honey', 'Pan de papa con ajonjolí tostado, salsa Killer, carne de res 100% artesanal, queso Monterrey Jack, mermelada de chorizo premium con Jack Daniels Honey, queso philadelphia y tocineta crujiente.', 32900, TRUE, 9, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/10_hamburguesa_dark_honey.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('34d83972-4b30-452b-a67c-03dfdf143076', '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('c0eea61a-aabe-4cff-ab2c-f0309f0d66e7', '34d83972-4b30-452b-a67c-03dfdf143076', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f05bc30c-53c6-434d-9245-bdd294122a0c', '34d83972-4b30-452b-a67c-03dfdf143076', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('93e07d3a-3e2d-4505-8665-6479943e0e7c', '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('5e241245-6694-497e-bf18-a66b37bf1aa2', '93e07d3a-3e2d-4505-8665-6479943e0e7c', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('c4e67edc-bf00-418b-aad1-3a06c2964b8f', '93e07d3a-3e2d-4505-8665-6479943e0e7c', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4725991-ec98-4e23-9cef-62f8b451db72', '93e07d3a-3e2d-4505-8665-6479943e0e7c', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('4aefe1d8-b22f-444a-af12-2562cf661ddb', '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 'Salsa Killer', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('8d9d185b-140e-4262-a918-387c531b409d', '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 'Mermelada de chorizo con Jack Honey', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('95826a7d-e180-4eb2-9ad6-b36f4341e1c3', '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 'Tocineta crujiente', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b0bf20fe-79b4-4232-a97d-b2b7f38fffbd', '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 'Queso philadelphia', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('5212f6a6-954e-4594-8c0b-7ff0a8960ff4', @rest_id, '8085568a-2377-47f8-b3d4-0ae6ca512f5f', 2, 0.04, 0.12, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Hamburguesa La Rock'N Pork
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('c835fa97-67d4-4aa1-9c0d-27cc5a50791d', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa La Rock''N Pork', 'Hamburguesa de 125gr de carne, pan Mollete de Antequera con semillas de amapola, mayonesa del huerto, queso Monterrey Jack, pulled pork ahumado con BBQ y tocineta crujiente.', 32900, TRUE, 10, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/11_hamburguesa_la_rock_n_pork.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('8bca0b5f-6618-4e66-9cdf-ac470d4aa1f8', 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 'Término de Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('3ea3d3ac-b4b4-457b-a60c-8619fa61fe9d', '8bca0b5f-6618-4e66-9cdf-ac470d4aa1f8', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('74d473cb-27b3-4c53-8ef0-d7cff713012d', '8bca0b5f-6618-4e66-9cdf-ac470d4aa1f8', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('dc6b9d07-e71d-4ab2-9e52-2355f0dfd850', '8bca0b5f-6618-4e66-9cdf-ac470d4aa1f8', 'Bien Cocida', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e313eb94-ca97-416b-985b-74663529ca3a', 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('b41ad81f-b539-4571-8eda-dbd93f252585', 'e313eb94-ca97-416b-985b-74663529ca3a', 'Papas a la francesa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f0caeb80-cb87-4623-8ae7-b7799b81573e', 'e313eb94-ca97-416b-985b-74663529ca3a', 'Cascos de papa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('40739899-1b88-4a5e-91c2-fe5078f8388d', 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 'Mayonesa del huerto', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9d68c6c6-948a-45ed-a9f7-4ed8fcc4e851', 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 'Pulled pork con salsa BBQ', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('d7c2e9d8-1fd7-4bf8-a0ab-dce48d1bf194', 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 'Tocineta crujiente', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('f5f4c14b-4844-4f61-bdf7-5ed97f016b77', 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 'Queso Monterrey Jack', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('19ae4ce3-7c61-4eab-b10f-ebeedf4d14c0', @rest_id, 'c835fa97-67d4-4aa1-9c0d-27cc5a50791d', 2, 0.04, 0.23, 0.92, 0.09, NOW(), NOW());

-- [Para Comer] Sándwich El Aguante Glam
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', @rest_id, 'e47dc7e5-b22d-11f1-9c00-9a51728b478c', 'Sándwich El Aguante Glam', 'Sándwich con pan brioche de papa, queso, tomate, lechuga, jamón de cerdo, maduritos, tocineta, champiñones y proteína (cerdo o pollo), acompañado con rústicas de la casa.', 26900, TRUE, 11, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/12_sandwich_el_aguante_glam.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('bda99ed5-f3ad-4445-ab50-2e8cf71f2f7b', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('1bd4ebcc-03d6-4086-9a5f-0a488ad574ad', 'bda99ed5-f3ad-4445-ab50-2e8cf71f2f7b', 'Papas Rústicas', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('633602eb-dc4d-423d-9a58-2736ab8fbf17', 'bda99ed5-f3ad-4445-ab50-2e8cf71f2f7b', 'Papas Francesas', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('db182305-0099-4c30-b866-d6f6d3966a84', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Proteína', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e10555e1-cebd-4dbf-8341-5d67bb5bdd47', 'db182305-0099-4c30-b866-d6f6d3966a84', 'Pechuga de Pollo', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('eb6ec5ce-1096-4abf-b356-ed684a926d05', 'db182305-0099-4c30-b866-d6f6d3966a84', 'Lomo de Cerdo', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('5c3945fd-1f44-4c9d-8e0f-d6fd390d3538', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Tocineta', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9033ffaf-8b92-4fc1-b3fb-07819f600dec', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Jamón de cerdo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9aaaaec9-7eb9-4be6-859c-1b2a430ed3d6', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Champiñones', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('be93a729-f4fb-4d57-99f3-9f62d72d2b42', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Tomate', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('c540024c-7afc-4b36-aab9-ecdfc6bc75d9', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Lechuga', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('e4753f87-837e-4923-829f-d182face9a6b', 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 'Maduritos', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('0ffa318b-7259-449d-add6-3df8d0a66918', @rest_id, 'b1c4fe60-5c8a-4b87-88a0-497571cc0cf0', 2, 0.04, 0.33, 0.92, 0.09, NOW(), NOW());

-- [Veggis del Aguante] Hamburguesa Veggi
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('f93a1a47-7463-4120-88c0-7500ca851849', @rest_id, 'e47dc879-b22d-11f1-9c00-9a51728b478c', 'Hamburguesa Veggi', 'Hamburguesa con pan brioche de papa, queso mozzarella, tomate, lechuga, medallón de arveja con trigo y rústicas de la casa.', 22900, TRUE, 12, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/13_hamburguesa_veggi.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('1b433af0-2e62-4e63-a1bf-3d505addd0c3', 'f93a1a47-7463-4120-88c0-7500ca851849', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('60b913de-75b9-429d-97c4-a2698e8ebd18', '1b433af0-2e62-4e63-a1bf-3d505addd0c3', 'Papas Rústicas', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('99bbc01d-94d0-48fd-8c01-e0429cbc1ae8', '1b433af0-2e62-4e63-a1bf-3d505addd0c3', 'Papas Francesas', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3521a9c3-e7cd-4499-b09e-c8509147163f', 'f93a1a47-7463-4120-88c0-7500ca851849', 'Tomate', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('63f83006-e06d-415b-8dd5-599a843f71fb', 'f93a1a47-7463-4120-88c0-7500ca851849', 'Queso mozzarella', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('feb87e60-1f44-47ff-bffc-ee14dc7a82dd', 'f93a1a47-7463-4120-88c0-7500ca851849', 'Lechuga', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('fbf1f773-2dd6-4d87-a918-c26da786d7a7', @rest_id, 'f93a1a47-7463-4120-88c0-7500ca851849', 2, 0.04, 0.65, 0.92, 0.09, NOW(), NOW());

-- [Veggis del Aguante] Sándwich Veggi
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', @rest_id, 'e47dc879-b22d-11f1-9c00-9a51728b478c', 'Sándwich Veggi', 'Sándwich con pan brioche de papa, queso mozzarella, tomate, lechuga, maduritos, champiñones salteados y rústicas de la casa.', 22900, TRUE, 13, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/14_sandwich_veggi.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('3992d512-2c87-4328-af61-b1ec73a91ad3', 'aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', 'Acompañamiento', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('78755b0a-48b6-49cf-bea9-5416719537bb', '3992d512-2c87-4328-af61-b1ec73a91ad3', 'Papas Rústicas', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('90ba5d32-393e-4bc2-965f-559b467ec8bf', '3992d512-2c87-4328-af61-b1ec73a91ad3', 'Papas Francesas', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('32af1d7f-9b10-481a-a981-d361e542b629', 'aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', 'Champiñones', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('367327ce-d145-4e98-bbd6-7427f8d1bac5', 'aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', 'Maduritos', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('416cff8f-51be-4833-8614-a8f7ec5d7e54', 'aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', 'Tomate', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('c420d30b-dfd6-4a38-9a3d-e278ec5ad714', 'aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', 'Lechuga', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('b7161eaa-b59f-41be-8a19-7dffefe50941', @rest_id, 'aa29dedc-3a9b-43cc-8c00-e014f2c3c0da', 2, 0.04, 0.76, 0.92, 0.09, NOW(), NOW());

-- [Fuertes del Aguante] Lomo Fino de Res
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('3eb168ef-245c-4fda-a68d-7dbf25d2c734', @rest_id, 'e47dc910-b22d-11f1-9c00-9a51728b478c', 'Lomo Fino de Res', '250 gr de lomo fino de res a término, acompañado de papas rústicas con especias, chimichurri y ensalada de la casa.', 39900, TRUE, 14, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/15_lomo_fino_de_res.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('00f3aa8d-ee60-40a4-a4c9-2b7df34e33b3', '3eb168ef-245c-4fda-a68d-7dbf25d2c734', 'Término de la Carne', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('3b4e6e25-dbbc-497b-b306-0396cbdd23d4', '00f3aa8d-ee60-40a4-a4c9-2b7df34e33b3', 'Bien Asado', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('53f52fa3-1724-45a2-8445-5a6ebb787ca0', '00f3aa8d-ee60-40a4-a4c9-2b7df34e33b3', 'Término Medio', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('70426887-47bf-49f9-84fd-5c4caca33bb0', '00f3aa8d-ee60-40a4-a4c9-2b7df34e33b3', '3/4', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('1314b8f7-fc26-401b-a4cb-f208d1ae144f', '3eb168ef-245c-4fda-a68d-7dbf25d2c734', 'Ensalada fresca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('2ce3b1fc-e139-4ccb-9807-0330c9692d63', '3eb168ef-245c-4fda-a68d-7dbf25d2c734', 'Papas rústicas', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3b8523c7-a579-4297-ae9a-3b6d9396e215', '3eb168ef-245c-4fda-a68d-7dbf25d2c734', 'Chimichurri de la casa', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('e3e40e3a-aae3-432c-a39d-785f371d659b', @rest_id, '3eb168ef-245c-4fda-a68d-7dbf25d2c734', 3, 0.04, 0.2, 0.92, 0.58, NOW(), NOW());

-- [Fuertes del Aguante] Ternera Argentina
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('3bc2b1bc-fe7a-42d3-b672-bff112c9b48a', @rest_id, 'e47dc910-b22d-11f1-9c00-9a51728b478c', 'Ternera Argentina', '225 gr de ternera asada bañada con chimichurri acompañada de rústicas con especias y ensalada de la casa.', 31900, TRUE, 15, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/16_ternera_argentina.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('1bcb0c60-3d89-490a-a44a-abe1ed4dd178', '3bc2b1bc-fe7a-42d3-b672-bff112c9b48a', 'Papas rústicas', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('378443a1-87b2-43ec-a083-d8c410737f97', '3bc2b1bc-fe7a-42d3-b672-bff112c9b48a', 'Chimichurri artesanal', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('e3f97336-b9fa-4dc5-b313-2272b0e91902', '3bc2b1bc-fe7a-42d3-b672-bff112c9b48a', 'Ensalada fresca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('13583510-97e0-4199-a32e-5fc4696159e8', @rest_id, '3bc2b1bc-fe7a-42d3-b672-bff112c9b48a', 4, 0.04, 0.15, 0.92, 0.45, NOW(), NOW());

-- [Fuertes del Aguante] Costilla a la BBQ
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('de78017d-60ec-45f3-a871-0c765051ac78', @rest_id, 'e47dc910-b22d-11f1-9c00-9a51728b478c', 'Costilla a la BBQ', '300 gr de costilla St. Louis bañada en salsa BBQ, acompañados de papas rústicas y ensalada de la casa.', 33900, TRUE, 16, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/17_costilla_a_la_bbq.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3814169f-0c15-4578-9c23-928c0e2ff86d', 'de78017d-60ec-45f3-a871-0c765051ac78', 'Papas rústicas', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('57dd71e2-8047-4492-b8e1-60b20e13317e', 'de78017d-60ec-45f3-a871-0c765051ac78', 'Ensalada de la casa', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('929b1864-6ba0-43f6-b71d-77ca1ad35704', 'de78017d-60ec-45f3-a871-0c765051ac78', 'Salsa BBQ artesanal', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('fec3dcb5-1185-4621-9113-32dc53888cac', @rest_id, 'de78017d-60ec-45f3-a871-0c765051ac78', 4, 0.04, 0.85, 0.92, 0.14, NOW(), NOW());

-- [Fuertes del Aguante] Parrillada
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('096fb71b-0683-4209-bcd5-bc84647257f1', @rest_id, 'e47dc910-b22d-11f1-9c00-9a51728b478c', 'Parrillada', '350 gr de cortes de pollo, cerdo y lomo caracho de res asados con chorizos mixtos; acompañados con rústicas y ensalada de la casa.', 40500, TRUE, 17, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/18_parrillada.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('00c8fc22-7202-435e-879a-208bc40d8eea', '096fb71b-0683-4209-bcd5-bc84647257f1', 'Lomo de res', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('40e22008-f514-4b29-8a14-dca825741a85', '096fb71b-0683-4209-bcd5-bc84647257f1', 'Chimichurri', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('8778c84e-f4b7-421f-9b0a-808795fe4499', '096fb71b-0683-4209-bcd5-bc84647257f1', 'Lomo de cerdo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('a25dce9d-b78b-45fa-b680-96914a76415e', '096fb71b-0683-4209-bcd5-bc84647257f1', 'Chorizo mixto', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('d9240d7a-160c-412c-b383-9d5b712753bb', '096fb71b-0683-4209-bcd5-bc84647257f1', 'Cortes de pollo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('8f0ac9e6-e5a0-4cdb-85e0-a3aaed5be59b', @rest_id, '096fb71b-0683-4209-bcd5-bc84647257f1', 5, 0.04, 0.15, 0.92, 0.5, NOW(), NOW());

-- [Fuertes del Aguante] Suprema de Pollo
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('18744d3c-925d-457e-abd1-cc45f2d663bd', @rest_id, 'e47dc910-b22d-11f1-9c00-9a51728b478c', 'Suprema de Pollo', '225 gr pechuga de pollo asado con chimichurri, papas rústicas y ensalada de la casa.', 30900, TRUE, 18, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/19_suprema_de_pollo.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('0f2ccda6-bae8-45c8-9f05-9e907deba07a', '18744d3c-925d-457e-abd1-cc45f2d663bd', 'Ensalada de la casa', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('536ee1b1-fe7d-4903-8418-d6ed3dcd0758', '18744d3c-925d-457e-abd1-cc45f2d663bd', 'Papas rústicas', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('7e95bc25-d8f3-4174-bc4e-90a9a1be101c', '18744d3c-925d-457e-abd1-cc45f2d663bd', 'Chimichurri', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b1b83dbe-d8a3-4d3d-9f8d-fad508775337', '18744d3c-925d-457e-abd1-cc45f2d663bd', 'Pechuga de pollo asada', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('c0336338-858b-4d2a-864b-c516ed4055f9', @rest_id, '18744d3c-925d-457e-abd1-cc45f2d663bd', 6, 0.04, 0.05, 0.92, 0.3, NOW(), NOW());

-- [Para Picar] Rústicas de Pollo
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('09dd8206-caeb-4258-b6ca-cc2211ff923a', @rest_id, 'e47dc9bc-b22d-11f1-9c00-9a51728b478c', 'Rústicas de Pollo', '300 gr de rústicas con tocineta, queso crema y filete de pollo de 120 gr asado en trocitos.', 23900, TRUE, 19, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/20_rusticas_de_pollo.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('00337a87-dd54-4449-9c3e-81d24bab94e1', '09dd8206-caeb-4258-b6ca-cc2211ff923a', 'Queso crema', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('2cf7e19c-0b25-43bb-8187-bf815bf8937a', '09dd8206-caeb-4258-b6ca-cc2211ff923a', 'Trocitos de pollo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('633b60c7-9c5c-4ff2-ac81-fd9180458da1', '09dd8206-caeb-4258-b6ca-cc2211ff923a', 'Tocineta', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('185c8678-ac9f-4b9a-aa3e-837556d97efc', @rest_id, '09dd8206-caeb-4258-b6ca-cc2211ff923a', 6, 0.04, 0.38, 0.92, 0.09, NOW(), NOW());

-- [Para Picar] Rústicas Indie
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('d06e1c7b-757b-47f7-bc67-66f7cb8f1e05', @rest_id, 'e47dc9bc-b22d-11f1-9c00-9a51728b478c', 'Rústicas Indie', '300 gr de papas rústicas con tocineta, 70g de pollo y res asados en trocitos, y queso fundido.', 26900, TRUE, 20, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/21_rusticas_indie.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('184ebe98-00f8-4dea-8f11-7d5f2a1bf89f', 'd06e1c7b-757b-47f7-bc67-66f7cb8f1e05', 'Trocitos de res', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('75449a19-50ea-4de5-95e6-ecb3a67bb2f3', 'd06e1c7b-757b-47f7-bc67-66f7cb8f1e05', 'Trocitos de pollo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('aa8f8155-ba75-498c-ac88-bf10ebcb84cb', 'd06e1c7b-757b-47f7-bc67-66f7cb8f1e05', 'Tocineta', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b16221e5-b235-4b4f-beb4-c76b7fc8c8e2', 'd06e1c7b-757b-47f7-bc67-66f7cb8f1e05', 'Queso fundido', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('7c0a9580-0606-439f-a395-2f95ddf128a4', @rest_id, 'd06e1c7b-757b-47f7-bc67-66f7cb8f1e05', 6, 0.04, 0.49, 0.92, 0.09, NOW(), NOW());

-- [Para Picar] Picada 400gr
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('3700ce08-6ce5-407d-8fe4-d3239fb14d75', @rest_id, 'e47dc9bc-b22d-11f1-9c00-9a51728b478c', 'Picada 400gr', '400 gr asados de pollo, res y cerdo con alitas, chorizo, maduros, tomate, mazorca, limón y papas rústicas.', 42900, TRUE, 21, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/22_picada_400gr.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('2267168e-c54e-4d6a-a337-e0a79e7bd0dd', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Mazorca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3396cac2-fc46-44f1-b15f-b866c91bf5f2', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Alitas', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('3ce00ae8-9fa9-4bf4-a3ac-582ed37cb2b7', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Pollo asado', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('90dff1ac-de35-4886-81ae-d95a860f3a27', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Cerdo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('a64fd59a-041a-4d14-a213-760b5517770a', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Maduros', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('bab1539b-c80d-4d52-b016-6a33ded72b0b', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Carne de res', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('ea6ae6f4-3bb9-4e1a-9d47-8c6cfdead69f', '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 'Chorizo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('e38ed62f-2b28-444a-a5e3-249451607b8c', @rest_id, '3700ce08-6ce5-407d-8fe4-d3239fb14d75', 6, 0.04, 0.59, 0.92, 0.09, NOW(), NOW());

-- [Alitas] Alitas BBQ
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('a5e9b4d1-42eb-40fd-bde1-72b95a348a6f', @rest_id, 'e47dca4c-b22d-11f1-9c00-9a51728b478c', 'Alitas BBQ', 'Alitas de pollo bañadas en salsa BBQ de la casa. Todas las alitas vienen acompañadas con papas, palitos de apio y zanahoria.', 24900, TRUE, 22, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/23_alitas_bbq.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('2709204e-95f1-4e86-bd52-e7e149da6966', 'a5e9b4d1-42eb-40fd-bde1-72b95a348a6f', 'Porción', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('4d8f98bc-93e8-4329-8bcd-b3e0c48e7f7e', '2709204e-95f1-4e86-bd52-e7e149da6966', 'X8 Unidades', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('53846c78-b5ec-4e8d-a54f-080b1be71c53', '2709204e-95f1-4e86-bd52-e7e149da6966', 'X16 Unidades', 21600, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9d82522f-6906-4a2f-9f17-d34c212da0d4', 'a5e9b4d1-42eb-40fd-bde1-72b95a348a6f', 'Apio', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b08891f8-d93a-4183-b566-91e4c9565a98', 'a5e9b4d1-42eb-40fd-bde1-72b95a348a6f', 'Salsa BBQ', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('e591d665-4993-4855-98ee-913d49d29367', 'a5e9b4d1-42eb-40fd-bde1-72b95a348a6f', 'Zanahoria', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('50a6fdff-5468-43ec-9b75-f92bf7ea1da8', @rest_id, 'a5e9b4d1-42eb-40fd-bde1-72b95a348a6f', 7, 0.04, 0.02, 0.92, 0.09, NOW(), NOW());

-- [Alitas] Alitas Miel Mostaza
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('82fbf54d-3eb5-4785-822c-ab57dd114639', @rest_id, 'e47dca4c-b22d-11f1-9c00-9a51728b478c', 'Alitas Miel Mostaza', 'Alitas de pollo bañadas en salsa miel mostaza artesanal. Acompañadas con papas, palitos de apio y zanahoria.', 24900, TRUE, 23, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/24_alitas_miel_mostaza.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('15ecccce-616f-40d1-8691-e0584392adff', '82fbf54d-3eb5-4785-822c-ab57dd114639', 'Porción', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('6060bc29-c7ba-461e-abb5-3204145ff30b', '15ecccce-616f-40d1-8691-e0584392adff', 'X8 Unidades', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('9105ae40-03e9-4255-8ca0-ab71df6d826c', '15ecccce-616f-40d1-8691-e0584392adff', 'X16 Unidades', 21600, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('07778e97-a4ff-4600-ba45-e4a211e77665', '82fbf54d-3eb5-4785-822c-ab57dd114639', 'Salsa Miel Mostaza', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('6546b414-f72c-49c6-847a-c79febb54cdb', '82fbf54d-3eb5-4785-822c-ab57dd114639', 'Zanahoria', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('cd205b21-ffb5-480a-ae08-df13588ff20b', '82fbf54d-3eb5-4785-822c-ab57dd114639', 'Apio', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('4161e67b-ef28-40b6-85df-6420ae0c54ea', @rest_id, '82fbf54d-3eb5-4785-822c-ab57dd114639', 7, 0.04, 0.12, 0.92, 0.09, NOW(), NOW());

-- [Alitas] Alitas Picantes
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('ee77a8ee-4bf4-4c41-a94f-519bc7f384ad', @rest_id, 'e47dca4c-b22d-11f1-9c00-9a51728b478c', 'Alitas Picantes', 'Alitas de pollo bañadas en salsa picante búfalo. Acompañadas con papas, palitos de apio y zanahoria.', 24900, TRUE, 24, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/25_alitas_picantes.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('9b01ddd8-3509-45d7-ac72-bc9c4bc78e41', 'ee77a8ee-4bf4-4c41-a94f-519bc7f384ad', 'Porción', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('985f9af6-791f-401d-97a3-55b6f13834bb', '9b01ddd8-3509-45d7-ac72-bc9c4bc78e41', 'X8 Unidades', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('ab84c87b-6df1-41ec-bb4f-5c177d647656', '9b01ddd8-3509-45d7-ac72-bc9c4bc78e41', 'X16 Unidades', 21600, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('0cd5acfb-c8b5-411f-8702-158999f288ea', 'ee77a8ee-4bf4-4c41-a94f-519bc7f384ad', 'Apio', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('12c38db2-0016-4140-8856-02b7695083e6', 'ee77a8ee-4bf4-4c41-a94f-519bc7f384ad', 'Salsa Picante Búfalo', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('ca7f661b-cb5b-486d-b543-f0d229b0faf3', 'ee77a8ee-4bf4-4c41-a94f-519bc7f384ad', 'Zanahoria', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('2ddb7280-b896-4584-a510-d9886c6c167b', @rest_id, 'ee77a8ee-4bf4-4c41-a94f-519bc7f384ad', 7, 0.04, 0.24, 0.92, 0.09, NOW(), NOW());

-- [Alitas] Alitas Jack Daniel's
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('5f29d45b-acb0-4182-ad43-125fef5de869', @rest_id, 'e47dca4c-b22d-11f1-9c00-9a51728b478c', 'Alitas Jack Daniel''s', 'Alitas de pollo bañadas en reducción BBQ Jack Daniel''s. Acompañadas con papas, palitos de apio y zanahoria.', 24900, TRUE, 25, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/26_alitas_jack_daniel_s.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('cc75d501-9356-4023-9176-c52d8fda7d5d', '5f29d45b-acb0-4182-ad43-125fef5de869', 'Porción', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('63bdee5f-7195-41ea-87f4-1c1dc96b5b74', 'cc75d501-9356-4023-9176-c52d8fda7d5d', 'X16 Unidades', 21600, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f9cd4dd1-c7ee-4092-a593-99568de92052', 'cc75d501-9356-4023-9176-c52d8fda7d5d', 'X8 Unidades', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('50ac24fe-1dc6-4a18-bfb0-3d30f8d254b9', '5f29d45b-acb0-4182-ad43-125fef5de869', 'Zanahoria', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('90b11491-aeaa-45f3-be0c-4038b0196ae4', '5f29d45b-acb0-4182-ad43-125fef5de869', 'Salsa BBQ Jack Daniel''s', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('970d1863-beeb-48d0-be02-87c51bd35d5a', '5f29d45b-acb0-4182-ad43-125fef5de869', 'Apio', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('e8169e90-726b-4e3d-b69f-427c6bd79770', @rest_id, '5f29d45b-acb0-4182-ad43-125fef5de869', 7, 0.04, 0.36, 0.92, 0.09, NOW(), NOW());

-- [Bebidas] Infusiones Frutales
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ad97e7-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Infusiones Frutales', 'Infusión aromática de frutas deshidratadas.', 9000, TRUE, 26, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b0491f-b22d-11f1-9c00-9a51728b478c', 'e4ad97e7-b22d-11f1-9c00-9a51728b478c', 'Sabor', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b14906-b22d-11f1-9c00-9a51728b478c', 'e4b0491f-b22d-11f1-9c00-9a51728b478c', 'Frutos Amarillos', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b15cc1-b22d-11f1-9c00-9a51728b478c', 'e4b0491f-b22d-11f1-9c00-9a51728b478c', 'Frutos Rojos', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('5779e086-82f0-4300-bd06-fb3afaf85998', @rest_id, 'e4ad97e7-b22d-11f1-9c00-9a51728b478c', 7, 0.04, 0.68, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Granizados
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ad9c64-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Granizados', 'Delicioso granizado espeso y refrescante.', 12900, TRUE, 27, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/28_granizados.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b04d56-b22d-11f1-9c00-9a51728b478c', 'e4ad9c64-b22d-11f1-9c00-9a51728b478c', 'Sabor', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b162e3-b22d-11f1-9c00-9a51728b478c', 'e4b04d56-b22d-11f1-9c00-9a51728b478c', 'Café', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b1648f-b22d-11f1-9c00-9a51728b478c', 'e4b04d56-b22d-11f1-9c00-9a51728b478c', 'Oreo', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('017b8a62-a7ef-4c0b-9c5f-779572cdb717', @rest_id, 'e4ad9c64-b22d-11f1-9c00-9a51728b478c', 7, 0.52, 0.68, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Hatsu
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ad9e8e-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Hatsu', 'Té Hatsu en botella en sus presentaciones favoritas.', 9000, TRUE, 28, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('d640d3c3-e3a0-4b30-9e40-9816df6d76f7', 'e4ad9e8e-b22d-11f1-9c00-9a51728b478c', 'Variedad', 'SINGLE_SELECT', FALSE, 0, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('221aa809-08cc-41ca-bb5e-269b7e825c3c', 'd640d3c3-e3a0-4b30-9e40-9816df6d76f7', 'Blanco', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('4666a8b0-fda8-48f8-97d0-68ba168e11e2', 'd640d3c3-e3a0-4b30-9e40-9816df6d76f7', 'Rojo', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('8279e6e6-d8bd-4860-937c-8cf25b0e57da', 'd640d3c3-e3a0-4b30-9e40-9816df6d76f7', 'Azul', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('bf29409e-c576-4541-8e4b-9aed1ef301f8', 'd640d3c3-e3a0-4b30-9e40-9816df6d76f7', 'Negro', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('54388731-004f-421e-804a-254c045b0fca', @rest_id, 'e4ad9e8e-b22d-11f1-9c00-9a51728b478c', 7, 0.04, 0.79, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Mr. Té
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ada054-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Mr. Té', 'Refrescante té listo para tomar.', 6500, TRUE, 29, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b05402-b22d-11f1-9c00-9a51728b478c', 'e4ada054-b22d-11f1-9c00-9a51728b478c', 'Sabor', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b165c7-b22d-11f1-9c00-9a51728b478c', 'e4b05402-b22d-11f1-9c00-9a51728b478c', 'Limón', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b167c0-b22d-11f1-9c00-9a51728b478c', 'e4b05402-b22d-11f1-9c00-9a51728b478c', 'Durazno', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('165c17af-8e22-4c9a-b60e-48e9cd64ac94', @rest_id, 'e4ada054-b22d-11f1-9c00-9a51728b478c', 7, 0.52, 0.79, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Hervidos
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ada11e-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Hervidos', 'Tradicional hervido caliente a base de frutas y licor.', 12900, TRUE, 30, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/31_hervidos.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b0575f-b22d-11f1-9c00-9a51728b478c', 'e4ada11e-b22d-11f1-9c00-9a51728b478c', 'Sabor', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b16901-b22d-11f1-9c00-9a51728b478c', 'e4b0575f-b22d-11f1-9c00-9a51728b478c', 'Frutos Rojos', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b16a43-b22d-11f1-9c00-9a51728b478c', 'e4b0575f-b22d-11f1-9c00-9a51728b478c', 'Frutos Amarillos', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('97229a0d-e042-4062-88a4-42ea2b4c180c', @rest_id, 'e4ada11e-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.02, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Soda
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ada2c1-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Soda', 'Soda clásica bien fría con hielo y limón.', 6000, TRUE, 31, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/34_soda_de_frutos_amarillos.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('f21ce615-77db-481f-a1cc-34e48084eb76', @rest_id, 'e4ada2c1-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.02, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Soda de Frutos Verdes
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ada462-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Soda de Frutos Verdes', 'Refrescante soda saborizada con manzana verde y kiwi.', 9500, TRUE, 32, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('b23ad66c-591d-4947-801b-66dd9682d994', @rest_id, 'e4ada462-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.12, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Soda de Frutos Amarillos
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4ada607-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Soda de Frutos Amarillos', 'Refrescante soda con maracuyá y naranja.', 9500, TRUE, 33, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('6ad1002e-f5d0-48b1-a6a5-0623fae8f45a', @rest_id, 'e4ada607-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.12, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Soda de Frutos Rojos
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adb7be-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Soda de Frutos Rojos', 'Refrescante soda con fresas, moras y arándanos.', 9500, TRUE, 34, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/50_frutos_rojos.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('5faab984-d0ed-4882-83da-cacc2c3a8906', @rest_id, 'e4adb7be-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.24, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Jugos Naturales
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adbc3e-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Jugos Naturales', 'Jugo de fruta 100% natural preparado al instante.', 8500, TRUE, 35, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('4cdea424-143d-4134-984c-d8aec5a42dbe', 'e4adbc3e-b22d-11f1-9c00-9a51728b478c', 'Fruta', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('4e005c05-7be6-42eb-a018-fae6b8c756f0', '4cdea424-143d-4134-984c-d8aec5a42dbe', 'Mango', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('75e20f59-18f5-4487-8205-9e626e335114', '4cdea424-143d-4134-984c-d8aec5a42dbe', 'Mora', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('c199e283-ce2a-4526-bbe2-6b4c609d5228', '4cdea424-143d-4134-984c-d8aec5a42dbe', 'Lulo', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e61210f3-6db4-4290-807c-d6528c3c2adc', '4cdea424-143d-4134-984c-d8aec5a42dbe', 'Maracuyá', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b05990-b22d-11f1-9c00-9a51728b478c', 'e4adbc3e-b22d-11f1-9c00-9a51728b478c', 'Base', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b16b71-b22d-11f1-9c00-9a51728b478c', 'e4b05990-b22d-11f1-9c00-9a51728b478c', 'En agua', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b16c9c-b22d-11f1-9c00-9a51728b478c', 'e4b05990-b22d-11f1-9c00-9a51728b478c', 'En leche', 1000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('bd1a02f9-d412-448e-88ba-31c3de8dddff', @rest_id, 'e4adbc3e-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.24, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Jugo de Frutos Rojos
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adbeed-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Jugo de Frutos Rojos', 'Mezcla artesanal de frutos rojos naturales.', 8500, TRUE, 36, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b05c6b-b22d-11f1-9c00-9a51728b478c', 'e4adbeed-b22d-11f1-9c00-9a51728b478c', 'Base', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b16dc0-b22d-11f1-9c00-9a51728b478c', 'e4b05c6b-b22d-11f1-9c00-9a51728b478c', 'En agua', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b16f03-b22d-11f1-9c00-9a51728b478c', 'e4b05c6b-b22d-11f1-9c00-9a51728b478c', 'En leche', 1000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('1039ee28-2e3b-4a21-9e12-67b3e5307f65', @rest_id, 'e4adbeed-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.35, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Limonada Natural
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adc0cd-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Limonada Natural', 'Limonada clásica fresca recién exprimida.', 8500, TRUE, 37, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('3f828d7e-0ac8-4252-bb10-029e6ea9b137', @rest_id, 'e4adc0cd-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.35, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Limonada de Coco
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adc284-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Limonada de Coco', 'Cremosa y refrescante limonada con leche de coco.', 12500, TRUE, 38, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('eb989651-713e-4238-b304-5b83df2b95dc', @rest_id, 'e4adc284-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.47, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Limonada Cereza
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adc346-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Limonada Cereza', 'Limonada dulce y fresca con reducción de cerezas.', 11500, TRUE, 39, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('031b5008-5017-4b35-b86c-7c141b45566d', @rest_id, 'e4adc346-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.47, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Limonada Piña - Hierbabuena
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adc4cf-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Limonada Piña - Hierbabuena', 'Limonada fresca con pulpa de piña y hojas de hierbabuena maceradas.', 11500, TRUE, 40, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('1cd3cba4-e7cc-44c8-85c6-dac200b2a38f', @rest_id, 'e4adc4cf-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.58, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Coca Cola
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adc66c-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Coca Cola', 'Coca Cola 400ml bien fría.', 6500, TRUE, 41, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b05ee9-b22d-11f1-9c00-9a51728b478c', 'e4adc66c-b22d-11f1-9c00-9a51728b478c', 'Tipo', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e0a24860-3dca-4694-a7bb-8abf66574c16', 'e4b05ee9-b22d-11f1-9c00-9a51728b478c', 'Sin Azúcar / Light', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b1702f-b22d-11f1-9c00-9a51728b478c', 'e4b05ee9-b22d-11f1-9c00-9a51728b478c', 'Original', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b172cf-b22d-11f1-9c00-9a51728b478c', 'e4b05ee9-b22d-11f1-9c00-9a51728b478c', 'Light', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('df6c8e3f-5b9d-4091-8bec-90cf2a731370', @rest_id, 'e4adc66c-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.58, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Botella de Agua
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adc96e-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Botella de Agua', 'Agua pura sin gas en botella.', 6000, TRUE, 42, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('32ad01db-fd12-4618-9c6e-fe74bdc4d5ab', @rest_id, 'e4adc96e-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.69, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Brownie con Helado
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adca79-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Brownie con Helado', 'Brownie de chocolate caliente con bola de helado de vainilla y salsa de chocolate.', 12500, TRUE, 43, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('9bc36b1b-2936-421e-b281-a801b4f1b928', @rest_id, 'e4adca79-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.69, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Malteada
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4adcc45-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Malteada', 'Cremosa malteada preparada con helado artesanal.', 12900, TRUE, 44, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b06799-b22d-11f1-9c00-9a51728b478c', 'e4adcc45-b22d-11f1-9c00-9a51728b478c', 'Sabor', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('853d1024-83eb-4ee7-998d-18168a8f4877', 'e4b06799-b22d-11f1-9c00-9a51728b478c', 'Oreo', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b18187-b22d-11f1-9c00-9a51728b478c', 'e4b06799-b22d-11f1-9c00-9a51728b478c', 'Vainilla', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b18480-b22d-11f1-9c00-9a51728b478c', 'e4b06799-b22d-11f1-9c00-9a51728b478c', 'Chocolate', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b1912e-b22d-11f1-9c00-9a51728b478c', 'e4b06799-b22d-11f1-9c00-9a51728b478c', 'Fresa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('8a9c626e-be8d-49f0-964b-84002c2c632d', @rest_id, 'e4adcc45-b22d-11f1-9c00-9a51728b478c', 8, 0.04, 0.79, 0.44, 0.09, NOW(), NOW());

-- [Bebidas] Gaseosa
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4add1b1-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcadc-b22d-11f1-9c00-9a51728b478c', 'Gaseosa', 'Gaseosa nacional 400ml.', 6500, TRUE, 45, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b06494-b22d-11f1-9c00-9a51728b478c', 'e4add1b1-b22d-11f1-9c00-9a51728b478c', 'Sabor', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('cf30b9ee-ae61-4336-a6af-4e6b13e239c8', 'e4b06494-b22d-11f1-9c00-9a51728b478c', 'Manzana Postobón', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b17422-b22d-11f1-9c00-9a51728b478c', 'e4b06494-b22d-11f1-9c00-9a51728b478c', 'Manzana', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b1755d-b22d-11f1-9c00-9a51728b478c', 'e4b06494-b22d-11f1-9c00-9a51728b478c', 'Colombiana', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('fcfc9db6-51de-44a0-870d-4be0abcab85e', @rest_id, 'e4add1b1-b22d-11f1-9c00-9a51728b478c', 8, 0.52, 0.79, 0.44, 0.09, NOW(), NOW());

-- [Cocktails] Orgasmo
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b22bb0-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcd08-b22d-11f1-9c00-9a51728b478c', 'Orgasmo', 'Baileys, licor de café y crema de leche.', 25900, TRUE, 46, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/47_orgasmo.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('4ce504ae-4468-4627-a15c-bcde9a37a0c3', 'e4b22bb0-b22d-11f1-9c00-9a51728b478c', 'Crema de leche', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('80562643-8258-4043-9d82-67c1ac2ae00e', 'e4b22bb0-b22d-11f1-9c00-9a51728b478c', 'Baileys', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('c31e166d-be6b-4f17-8964-a3508582eb88', 'e4b22bb0-b22d-11f1-9c00-9a51728b478c', 'Licor de café', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('89341ddc-6e75-4b3c-a70c-903d12c519a6', @rest_id, 'e4b22bb0-b22d-11f1-9c00-9a51728b478c', 9, 0.04, 0.19, 0.92, 0.09, NOW(), NOW());

-- [Mojitos] Mojito Clásico
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b324cb-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcdd8-b22d-11f1-9c00-9a51728b478c', 'Mojito Clásico', 'Ron Havana Club 3 años, hierbabuena, limón y soda.', 25900, TRUE, 47, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('0ddf9474-be9d-49e1-84e5-ee0e2ea41446', 'e4b324cb-b22d-11f1-9c00-9a51728b478c', 'Ron Havana Club 3 años', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('693cc502-dda9-4067-9994-5c066f489bdc', 'e4b324cb-b22d-11f1-9c00-9a51728b478c', 'Soda', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('6c9d3449-da4f-4801-8e90-459ddf07658c', 'e4b324cb-b22d-11f1-9c00-9a51728b478c', 'Hierbabuena fresca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9ea226ee-2262-466e-93b0-7aca40882822', 'e4b324cb-b22d-11f1-9c00-9a51728b478c', 'Limón', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('3d4c9386-86b9-4b03-a080-da536b8dd8fa', @rest_id, 'e4b324cb-b22d-11f1-9c00-9a51728b478c', 9, 0.04, 0.37, 0.92, 0.09, NOW(), NOW());

-- [Mojitos] Mojito Maracuyá
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b3497a-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcdd8-b22d-11f1-9c00-9a51728b478c', 'Mojito Maracuyá', 'Ron Havana Club 3 años, hierbabuena, limón, soda y maracuyá.', 26900, TRUE, 48, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/53_maracuya.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('06473e3c-3ca4-41b2-ba86-cb996f4b0a5b', 'e4b3497a-b22d-11f1-9c00-9a51728b478c', 'Hierbabuena fresca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('664ecbf4-73ab-416c-a75c-caf0a79881de', 'e4b3497a-b22d-11f1-9c00-9a51728b478c', 'Ron Havana Club 3 años', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('96901631-15b2-40c7-9060-484c5079e6e7', 'e4b3497a-b22d-11f1-9c00-9a51728b478c', 'Soda', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('d482e6d8-5db2-4093-a74e-4acece0857a5', 'e4b3497a-b22d-11f1-9c00-9a51728b478c', 'Maracuyá', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('f6de0ead-cd5c-44a5-a131-2d81c84f2634', 'e4b3497a-b22d-11f1-9c00-9a51728b478c', 'Limón', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('55867a3e-d2d9-40c8-b94b-038ed7d176bc', @rest_id, 'e4b3497a-b22d-11f1-9c00-9a51728b478c', 9, 0.04, 0.48, 0.92, 0.09, NOW(), NOW());

-- [Mojitos] Mojito Frutos Rojos
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b34bfe-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcdd8-b22d-11f1-9c00-9a51728b478c', 'Mojito Frutos Rojos', 'Ron Havana Club 3 años, hierbabuena, limón, soda y frutos rojos macerados.', 26900, TRUE, 49, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('14c016e0-56f9-475b-ab4d-1ebcc5e6f8b9', 'e4b34bfe-b22d-11f1-9c00-9a51728b478c', 'Hierbabuena fresca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('201f26a1-54de-4132-9cc3-008d96fe49bd', 'e4b34bfe-b22d-11f1-9c00-9a51728b478c', 'Limón', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('2892b919-6a38-4519-918e-eedbc23495ee', 'e4b34bfe-b22d-11f1-9c00-9a51728b478c', 'Ron Havana Club 3 años', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('4b987446-9cb0-40e6-aa61-39a0834a33ac', 'e4b34bfe-b22d-11f1-9c00-9a51728b478c', 'Frutos rojos', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9e12a163-1592-4bbe-bb8d-4b9ef855571c', 'e4b34bfe-b22d-11f1-9c00-9a51728b478c', 'Soda', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('9ee3d896-6f06-4a0f-abd9-0112c3ffcb35', @rest_id, 'e4b34bfe-b22d-11f1-9c00-9a51728b478c', 9, 0.04, 0.58, 0.92, 0.09, NOW(), NOW());

-- [Mojitos] Mojito Beer
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b34dbb-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcdd8-b22d-11f1-9c00-9a51728b478c', 'Mojito Beer', 'Ron Havana Club 3 años, hierbabuena, limón, soda y Coronita (cerveza).', 27900, TRUE, 50, 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/51_beer.webp')
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('31dc592c-cd75-48bb-875f-a7702386c815', 'e4b34dbb-b22d-11f1-9c00-9a51728b478c', 'Cerveza Coronita', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('6c01ddf3-5062-42a4-ad35-0aa5a87512a0', 'e4b34dbb-b22d-11f1-9c00-9a51728b478c', 'Ron Havana Club 3 años', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b02b933f-facf-4f4f-90e6-f2b56279743a', 'e4b34dbb-b22d-11f1-9c00-9a51728b478c', 'Hierbabuena', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('c7bf5c34-9b55-436d-9ecc-4e5dc87f97f8', 'e4b34dbb-b22d-11f1-9c00-9a51728b478c', 'Limón', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('8eafefa5-4722-4656-9f0d-15eade6886d4', @rest_id, 'e4b34dbb-b22d-11f1-9c00-9a51728b478c', 9, 0.04, 0.68, 0.92, 0.09, NOW(), NOW());

-- [Margaritas] Margarita Clásica
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b3cad2-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcf50-b22d-11f1-9c00-9a51728b478c', 'Margarita Clásica', 'Tequila, limón y sal de la casa.', 25900, TRUE, 51, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('443b9d1c-6925-4a0e-99dd-9232f11e7737', 'e4b3cad2-b22d-11f1-9c00-9a51728b478c', 'Tequila', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('967704d3-7459-4da1-a0e6-747a3ec0e1dd', 'e4b3cad2-b22d-11f1-9c00-9a51728b478c', 'Limón recién exprimido', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('acf84729-8351-4810-8769-d2fb2c950146', 'e4b3cad2-b22d-11f1-9c00-9a51728b478c', 'Sal escarchada', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('a344aaa0-1ab3-4ed7-88d2-7e8da32c2311', @rest_id, 'e4b3cad2-b22d-11f1-9c00-9a51728b478c', 9, 0.04, 0.86, 0.92, 0.09, NOW(), NOW());

-- [Margaritas] Margarita Maracuyá
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b3dd3f-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcf50-b22d-11f1-9c00-9a51728b478c', 'Margarita Maracuyá', 'Tequila, limón, sal de la casa y maracuyá.', 26900, TRUE, 52, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('014744d3-78f2-4a45-beec-f6bb39558c48', 'e4b3dd3f-b22d-11f1-9c00-9a51728b478c', 'Sal', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('7787de97-db03-474b-807f-13f26f69158f', 'e4b3dd3f-b22d-11f1-9c00-9a51728b478c', 'Tequila', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('df98250b-7e0e-4008-81d1-c463356f9a39', 'e4b3dd3f-b22d-11f1-9c00-9a51728b478c', 'Pulpa de maracuyá', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('ef60e930-2ad9-4593-ac26-07f78b7b699a', 'e4b3dd3f-b22d-11f1-9c00-9a51728b478c', 'Limón', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('f158a0c6-87fd-410c-adf7-b1b2563e1242', @rest_id, 'e4b3dd3f-b22d-11f1-9c00-9a51728b478c', 10, 0.04, 0.02, 0.92, 0.08, NOW(), NOW());

-- [Margaritas] Margarita Blue
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b3df9a-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dcf50-b22d-11f1-9c00-9a51728b478c', 'Margarita Blue', 'Tequila, curacao azul, limón y sal de la casa.', 26900, TRUE, 53, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('0a04046e-409a-4975-aa6b-bbaf2c0a1622', 'e4b3df9a-b22d-11f1-9c00-9a51728b478c', 'Sal', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('26cce975-abcf-4002-aeb1-880068b749d9', 'e4b3df9a-b22d-11f1-9c00-9a51728b478c', 'Curacao Azul', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('5a23a08e-7745-4216-8d2c-f5d2fbbbaa53', 'e4b3df9a-b22d-11f1-9c00-9a51728b478c', 'Limón', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('ca321d31-fbe1-4181-b72e-ba558ccc4855', 'e4b3df9a-b22d-11f1-9c00-9a51728b478c', 'Tequila', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('fb6047fc-a5b6-4f03-a9c2-34557a56d8a2', @rest_id, 'e4b3df9a-b22d-11f1-9c00-9a51728b478c', 10, 0.04, 0.11, 0.92, 0.08, NOW(), NOW());

-- [Gin Tonic] Gin Tonic Clásico
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b5187c-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd05d-b22d-11f1-9c00-9a51728b478c', 'Gin Tonic Clásico', 'Gin, agua tónica premium y rodaja de naranja fresca.', 27900, TRUE, 54, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('1a96e0c6-38f6-47de-a682-59f6e7329d3c', 'e4b5187c-b22d-11f1-9c00-9a51728b478c', 'Gin', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('a93f702a-b635-4974-a488-9ad4b8aebc46', 'e4b5187c-b22d-11f1-9c00-9a51728b478c', 'Agua Tónica', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('cd97e8fd-5f68-4aef-a6b4-7aae35d51f00', 'e4b5187c-b22d-11f1-9c00-9a51728b478c', 'Naranja fresca', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('60a755f1-0ce6-4e75-af11-b9179d27e456', @rest_id, 'e4b5187c-b22d-11f1-9c00-9a51728b478c', 10, 0.04, 0.28, 0.92, 0.08, NOW(), NOW());

-- [Gin Tonic] Gin Tonic Frutos Rojos
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b539b1-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd05d-b22d-11f1-9c00-9a51728b478c', 'Gin Tonic Frutos Rojos', 'Gin, agua tónica premium y frutos rojos.', 28900, TRUE, 55, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('21570eeb-74a5-4b63-80c9-083f95623ba9', 'e4b539b1-b22d-11f1-9c00-9a51728b478c', 'Gin', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('b1738440-267c-48d6-8436-b06c3d02b2af', 'e4b539b1-b22d-11f1-9c00-9a51728b478c', 'Frutos rojos macerados', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('dad26d06-312a-4c26-9851-93294be17222', 'e4b539b1-b22d-11f1-9c00-9a51728b478c', 'Agua Tónica', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('dd12e7b2-b94f-4775-8ab8-8fb75472c964', @rest_id, 'e4b539b1-b22d-11f1-9c00-9a51728b478c', 10, 0.04, 0.38, 0.92, 0.08, NOW(), NOW());

-- [Submarinos] Submarino de Tequila
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b5acb7-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd175-b22d-11f1-9c00-9a51728b478c', 'Submarino de Tequila', 'Cerveza nacional con shot invertido de tequila.', 17500, TRUE, 56, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('01c11d89-f4c6-4f28-bcc8-6ee6fcb89ec4', 'e4b5acb7-b22d-11f1-9c00-9a51728b478c', 'Shot de Tequila', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('37d82e43-d075-438e-a8be-fdc7a880b3e7', 'e4b5acb7-b22d-11f1-9c00-9a51728b478c', 'Cerveza Nacional', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('43652f5b-bed0-44f0-ae7f-77a06c4b07e6', @rest_id, 'e4b5acb7-b22d-11f1-9c00-9a51728b478c', 10, 0.04, 0.57, 0.92, 0.08, NOW(), NOW());

-- [Submarinos] Submarino de Vodka
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b5c4c9-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd175-b22d-11f1-9c00-9a51728b478c', 'Submarino de Vodka', 'Cerveza nacional con shot invertido de vodka.', 17500, TRUE, 57, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('9bd964bc-3c9c-4840-a8f2-36aa410e5923', 'e4b5c4c9-b22d-11f1-9c00-9a51728b478c', 'Cerveza Nacional', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO product_ingredients (id, productId, name, isRemovable) VALUES ('d5932ef2-42b0-4089-9dee-1f4800af9e71', 'e4b5c4c9-b22d-11f1-9c00-9a51728b478c', 'Shot de Vodka', TRUE) ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('a3f78101-3e80-47da-b2fa-058c4eaf5cf5', @rest_id, 'e4b5c4c9-b22d-11f1-9c00-9a51728b478c', 10, 0.04, 0.66, 0.92, 0.08, NOW(), NOW());

-- [Licores] Jack Daniel's Old No. 7
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b62e02-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Jack Daniel''s Old No. 7', 'Whiskey americano Tennessee Jack Daniel''s.', 22000, TRUE, 58, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b79599-b22d-11f1-9c00-9a51728b478c', 'e4b62e02-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b8af53-b22d-11f1-9c00-9a51728b478c', 'e4b79599-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b8e385-b22d-11f1-9c00-9a51728b478c', 'e4b79599-b22d-11f1-9c00-9a51728b478c', 'Botella', 198000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f302b52e-a1db-4db6-8a18-ed55635624dc', 'e4b79599-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 198000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f7eb9fe6-6459-49d9-b2c9-3d4816abb49a', 'e4b79599-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('4737527b-9b89-455b-ba16-7c90aceeff9f', @rest_id, 'e4b62e02-b22d-11f1-9c00-9a51728b478c', 11, 0.04, 0.04, 0.92, 0.09, NOW(), NOW());

-- [Licores] Buchanan's 12 Años
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b637ad-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Buchanan''s 12 Años', 'Whisky escocés añejado 12 años.', 28000, TRUE, 59, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'e4b637ad-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('23c668a5-eaba-488d-be26-9f8a4b30236c', 'e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 262000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('829a0e89-3153-4516-9427-a950fa49a5da', 'e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('afaa5e0a-6851-43d6-b7d2-49c2dcead80d', 'e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'Media (375ml)', 127000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b99c09-b22d-11f1-9c00-9a51728b478c', 'e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b9a815-b22d-11f1-9c00-9a51728b478c', 'e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'Media botella', 127000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4b9aa71-b22d-11f1-9c00-9a51728b478c', 'e4b79b7b-b22d-11f1-9c00-9a51728b478c', 'Botella', 262000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('998af88f-5bc6-4e3a-94df-f8bf4923c5f5', @rest_id, 'e4b637ad-b22d-11f1-9c00-9a51728b478c', 11, 0.04, 0.17, 0.92, 0.1, NOW(), NOW());

-- [Licores] Olmeca Reposado
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b63bbb-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Olmeca Reposado', 'Tequila mexicano reposado en barricas de roble.', 18000, TRUE, 60, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'e4b63bbb-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('1a254297-78c2-494e-8add-d2ca93100037', 'e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 137000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('42a6e8da-8a61-4711-b036-ce0c934c7c40', 'e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('d1bf0ae7-a08f-4bbe-b154-51f751d4319c', 'e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'Media (375ml)', 64000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bacf37-b22d-11f1-9c00-9a51728b478c', 'e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bafb51-b22d-11f1-9c00-9a51728b478c', 'e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'Media botella', 64000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bb0046-b22d-11f1-9c00-9a51728b478c', 'e4b79f4f-b22d-11f1-9c00-9a51728b478c', 'Botella', 137000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('76d9c934-7451-4ead-a37b-f5138494cc1c', @rest_id, 'e4b63bbb-b22d-11f1-9c00-9a51728b478c', 11, 0.04, 0.4, 0.92, 0.1, NOW(), NOW());

-- [Licores] Jägermeister
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b63f4c-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Jägermeister', 'Licor de 56 hierbas alemán bien frío.', 20000, TRUE, 61, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7a206-b22d-11f1-9c00-9a51728b478c', 'e4b63f4c-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('86df40f7-621d-4c3e-a961-5e0f792c72d2', 'e4b7a206-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bb9d1d-b22d-11f1-9c00-9a51728b478c', 'e4b7a206-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bbba3b-b22d-11f1-9c00-9a51728b478c', 'e4b7a206-b22d-11f1-9c00-9a51728b478c', 'Botella', 175000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('f8a8ca7b-4c92-432f-bcba-d2f63c5f4fde', 'e4b7a206-b22d-11f1-9c00-9a51728b478c', 'Botella (700ml)', 175000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('6608c51f-c4d8-4f0c-8088-ec298b4d8c3f', @rest_id, 'e4b63f4c-b22d-11f1-9c00-9a51728b478c', 11, 0.04, 0.62, 0.92, 0.1, NOW(), NOW());

-- [Licores] Ron Viejo de Caldas
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b6414a-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Ron Viejo de Caldas', 'Ron tradicional colombiano carta de oro.', 13000, TRUE, 62, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'e4b6414a-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('34e9342f-7f4f-4925-bf1d-b1888d55993b', 'e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'Media (375ml)', 39000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('460c7339-51a9-4567-b059-8f1f4629dab5', 'e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('9c42275a-5dcc-4158-a419-9be34cbc7aa0', 'e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 77000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bc233e-b22d-11f1-9c00-9a51728b478c', 'e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bc3618-b22d-11f1-9c00-9a51728b478c', 'e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'Media botella', 39000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bc3862-b22d-11f1-9c00-9a51728b478c', 'e4b7a4fe-b22d-11f1-9c00-9a51728b478c', 'Botella', 77000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('409631ab-df14-4ee2-989d-f4dd223a636a', @rest_id, 'e4b6414a-b22d-11f1-9c00-9a51728b478c', 11, 0.04, 0.82, 0.92, 0.1, NOW(), NOW());

-- [Licores] Havana Club 3 Años
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b6460a-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Havana Club 3 Años', 'Ron blanco cubano añejo.', 16000, TRUE, 63, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7a81c-b22d-11f1-9c00-9a51728b478c', 'e4b6460a-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('400ab550-e937-4825-af4a-fe1e5b0f533e', 'e4b7a81c-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 104000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bc9e43-b22d-11f1-9c00-9a51728b478c', 'e4b7a81c-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bcaaa3-b22d-11f1-9c00-9a51728b478c', 'e4b7a81c-b22d-11f1-9c00-9a51728b478c', 'Botella', 104000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('fcd6c3a0-2f8a-4d13-b570-d535b6014152', 'e4b7a81c-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('ca556772-5f2d-401d-8c24-6b361cd1d187', @rest_id, 'e4b6460a-b22d-11f1-9c00-9a51728b478c', 12, 0.04, 0.02, 0.92, 0.1, NOW(), NOW());

-- [Licores] Absolut Vodka
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b650ef-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Absolut Vodka', 'Vodka sueco destilado de trigo.', 18000, TRUE, 64, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'e4b650ef-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('1f22f634-4b2e-4128-89cf-9708a878f4e5', 'e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 137000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('208ed320-02f7-4517-b487-4a565ff0c8f4', 'e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'Shot', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('b1a411e1-a648-4bdb-9e9c-6ccfd40e5837', 'e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'Media (375ml)', 64000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bd1bc1-b22d-11f1-9c00-9a51728b478c', 'e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'Shot (50ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bd2403-b22d-11f1-9c00-9a51728b478c', 'e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'Media botella', 64000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bd25c5-b22d-11f1-9c00-9a51728b478c', 'e4b7aaed-b22d-11f1-9c00-9a51728b478c', 'Botella', 137000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('74627bcc-58bd-42c9-9513-3e10927ee057', @rest_id, 'e4b650ef-b22d-11f1-9c00-9a51728b478c', 12, 0.04, 0.17, 0.92, 0.1, NOW(), NOW());

-- [Licores] Aguardiente Caucano Verde
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b657bc-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Aguardiente Caucano Verde', 'Aguardiente Caucano tradicional sin azúcar.', 37000, TRUE, 65, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7af93-b22d-11f1-9c00-9a51728b478c', 'e4b657bc-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('19c2e0de-862b-4f9f-b05f-94f6b13f6493', 'e4b7af93-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 33000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('5210a832-8219-4855-b97a-a2e0762ac725', 'e4b7af93-b22d-11f1-9c00-9a51728b478c', 'Media (375ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bd88a9-b22d-11f1-9c00-9a51728b478c', 'e4b7af93-b22d-11f1-9c00-9a51728b478c', 'Media botella', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bd9050-b22d-11f1-9c00-9a51728b478c', 'e4b7af93-b22d-11f1-9c00-9a51728b478c', 'Botella', 33000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('7c702d2c-7e71-4360-819b-0ede23a2a37b', @rest_id, 'e4b657bc-b22d-11f1-9c00-9a51728b478c', 12, 0.04, 0.39, 0.92, 0.1, NOW(), NOW());

-- [Licores] Aguardiente Caucano Azul
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b65c24-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Aguardiente Caucano Azul', 'Aguardiente Caucano tradicional con azúcar.', 42000, TRUE, 66, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7b19b-b22d-11f1-9c00-9a51728b478c', 'e4b65c24-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('4bba89f5-266e-404f-8c3a-c46c7d9c4482', 'e4b7b19b-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 33000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('d7be1e6f-5de6-499d-8045-8f1420f2e8aa', 'e4b7b19b-b22d-11f1-9c00-9a51728b478c', 'Media (375ml)', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4be1bb6-b22d-11f1-9c00-9a51728b478c', 'e4b7b19b-b22d-11f1-9c00-9a51728b478c', 'Media botella', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4be2585-b22d-11f1-9c00-9a51728b478c', 'e4b7b19b-b22d-11f1-9c00-9a51728b478c', 'Botella', 33000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('70f6d84f-f03b-45a2-a564-123da27413c7', @rest_id, 'e4b65c24-b22d-11f1-9c00-9a51728b478c', 12, 0.04, 0.52, 0.92, 0.1, NOW(), NOW());

-- [Licores] Vino Tinto
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b65ddd-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Vino Tinto', 'Vino tinto de la casa.', 11000, TRUE, 67, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7b455-b22d-11f1-9c00-9a51728b478c', 'e4b65ddd-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('1ab38681-d9f1-4661-a021-0df574a2f585', 'e4b7b455-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 37000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4be8531-b22d-11f1-9c00-9a51728b478c', 'e4b7b455-b22d-11f1-9c00-9a51728b478c', 'Copa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4be8c9b-b22d-11f1-9c00-9a51728b478c', 'e4b7b455-b22d-11f1-9c00-9a51728b478c', 'Botella', 37000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('a80fd4d1-6d09-4d5c-b2ab-9df7aa8d6b1b', @rest_id, 'e4b65ddd-b22d-11f1-9c00-9a51728b478c', 12, 0.04, 0.72, 0.92, 0.1, NOW(), NOW());

-- [Licores] Gato Negro Cabernet
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b66040-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Gato Negro Cabernet', 'Vino chileno Cabernet Sauvignon.', 16000, TRUE, 68, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO modifier_groups (id, productId, name, type, isRequired, minSelect, maxSelect) VALUES ('e4b7c042-b22d-11f1-9c00-9a51728b478c', 'e4b66040-b22d-11f1-9c00-9a51728b478c', 'Presentación', 'SINGLE_SELECT', TRUE, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('39ad2364-8ff6-4624-8f7a-3709adce8fc9', 'e4b7c042-b22d-11f1-9c00-9a51728b478c', 'Botella (750ml)', 64000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bed566-b22d-11f1-9c00-9a51728b478c', 'e4b7c042-b22d-11f1-9c00-9a51728b478c', 'Copa', 0, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
  INSERT INTO modifier_options (id, groupId, name, extraPrice, isAvailable) VALUES ('e4bedc1c-b22d-11f1-9c00-9a51728b478c', 'e4b7c042-b22d-11f1-9c00-9a51728b478c', 'Botella', 64000, TRUE) ON DUPLICATE KEY UPDATE extraPrice = VALUES(extraPrice);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('e5b5402a-72a7-41a3-8962-fde8be650469', @rest_id, 'e4b66040-b22d-11f1-9c00-9a51728b478c', 12, 0.04, 0.82, 0.92, 0.1, NOW(), NOW());

-- [Licores] Vino Caliente
INSERT INTO products (id, restaurantId, categoryId, name, description, basePrice, isAvailable, orderIndex, imageUrl)
VALUES ('e4b66922-b22d-11f1-9c00-9a51728b478c', @rest_id, 'e47dd23d-b22d-11f1-9c00-9a51728b478c', 'Vino Caliente', 'Copa de vino caliente especiado con canela y cítricos.', 16000, TRUE, 69, NULL)
ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), name = VALUES(name), description = VALUES(description), basePrice = VALUES(basePrice), orderIndex = VALUES(orderIndex), imageUrl = VALUES(imageUrl);
INSERT INTO pdf_hotspots (id, restaurantId, productId, page, x, y, width, height, createdAt, updatedAt) VALUES ('d093f622-54b2-4db3-bf3d-615a912166dc', @rest_id, 'e4b66922-b22d-11f1-9c00-9a51728b478c', 13, 0.04, 0.02, 0.92, 0.1, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
-- =================== FIN SEED EL AGUANTE ===================
