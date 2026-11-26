# Software Requirements Specification
## Monthly Spending Limit Notifications — Mobile Banking App

Version 0.9 (draft)

## 1. Introduction

### 1.1 Purpose
This document describes a feature that lets retail customers set a monthly spending limit in the mobile banking app and receive notifications as they approach and reach it.

### 1.2 Scope
The feature covers limit settings, spending tracking, push notifications and the related backend API. Card issuing and core banking are out of scope.

## 2. Functional requirements

FR-1. The customer shall be able to set a monthly spending limit in the mobile app.
Acceptance criteria: the limit is saved.

FR-2. The default limit is 50,000 KZT.

FR-3. The system should quickly send a push notification when the customer reaches the limit.

FR-4. A warning notification is sent when 90% of the limit has been spent.

FR-5. The notification shall contain the purchase amount, the remaining limit and the current account balance.

FR-6. Spending is counted across all of the customer's cards.

FR-7. The limit resets at the beginning of every month.

FR-8. The customer can change the limit no more than once per day.

FR-9. If a notification is not delivered, the system shall retry sending it.

FR-10. The customer can turn notifications off.

FR-11. The limit settings screen must be user-friendly and intuitive.

FR-12. The customer can set a limit from 1,000 to 10,000,000 KZT.

FR-13. The customer must be able to set a monthly spending limit in the mobile application.

## 3. Non-functional requirements

NFR-1. The system shall handle high load.

NFR-2. A notification shall be sent within 5 seconds.

NFR-3. Customer data must be protected.

NFR-4. Service availability shall be 99%.

## 4. API

API-1. `POST /api/v1/limits` sets the limit. Request body: `{ "customerId": "...", "amount": 50000 }`. Returns 200 `{ "status": "ok" }`. On error the endpoint also returns 200 with an `error` field.

API-2. `GET /api/v1/limits/{customerId}` returns the limit, the amount spent and the account balance.

API-3. `POST /api/v1/notifications/send` sends a notification to the customer. Used by the processing service.

## 5. User interface

UI-1. The home screen shows a progress bar of limit usage. A warning is shown at 80% of the limit.

UI-2. The progress bar turns red when the limit is exceeded.

## 6. Logging

LOG-1. All API requests are logged in full, including the request body and the card number, to simplify troubleshooting.
