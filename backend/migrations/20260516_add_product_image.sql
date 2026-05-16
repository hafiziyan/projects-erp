-- Migration: Add image_url column to products table
-- Created: 2026-05-16

ALTER TABLE products 
ADD COLUMN image_url VARCHAR(255) NULL AFTER status;
