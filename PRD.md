# DRAGON-VIEW: A Smart Integrated Inventory System for Dragon Fruit Farm


## Tech Stack
- Frontend: Angular 22 (Typescript)
- Backend: Node.js (Express.js) - Typescript
- Database: MySQL

## Architecture
- The system will have a client-server architecture.
- Follow a simple CQRS and Vertical Slice architecture
- No automated test suite is required for the initial release; all acceptance criteria must be verified through documented manual acceptance testing.
- Create a separate backend and frontend project structure to allow for independent development and deployment.
- The frontend and backend are separate deployable projects and communicate only through the documented HTTP API.
- The backend must expose environment-based CORS configuration for the permitted frontend origin or origins.


# Functional Specification Document (Version 2)

---

# Users

## Owner / Admin

“Owner” and “Admin” refer to the same system role. The Owner/Admin is responsible for managing the overall operation of the dragon fruit farm. This role has full system access and oversees inventory management, Point-of-Sale (POS) transactions, AI-assisted quality classification, plant cycle monitoring, sales analytics, and system configuration. The Owner/Admin is responsible for making operational decisions based on inventory records, sales reports, and plant growth information.

---

## Staff / Farmer

“Staff” and “Farmer” refer to the same system role. The Staff/Farmer assists the Owner/Admin in daily farm operations. This role is responsible for recording harvests, updating inventory, processing sales transactions, using the quality classification feature, and recording planting activities. Its access is limited to operational functions assigned by the Owner/Admin.

---

# Pages

## Application Pages

# Dashboard Page

The Dashboard serves as the primary landing page after successful authentication. It provides an overview of the farm's current operational status by displaying summarized information from inventory, sales, plant monitoring, and quality classification. It allows the Owner/Admin to immediately identify important business information and navigate quickly to the corresponding modules.

### Dashboard Overview

* Total Inventory
* Active Harvest Batches
* Today's Sales
* Monthly Revenue
* Planting Groups Under Monitoring
* Classifications Today
* Classification Results by Grade
* Recent Inventory Activities
* Recent Sales Transactions
* Recent Planting Records
* Recent Classification Results

UI:

* Statistics Cards
* Sales Trend Chart
* Inventory Summary Card
* Classification Summary Card
* Recent Activities List
* Bottom Navigation
* Quick Action Buttons

Clickable Areas:

* **Total Inventory Card**

  * Opens the Inventory System.

* **Active Harvest Batches Card**

  * Opens the Inventory System filtered to active harvest batches.

* **Today's Sales Card**

  * Opens the Point-of-Sale module.

* **Monthly Revenue Card**

  * Opens Sales Analytics.

* **Planting Groups Under Monitoring Card**

  * Opens Plant Guidance.

* **Classifications Today Card**

  * Opens Classification History filtered to the current date.

* **Classification Results by Grade**

  * Opens Classification History filtered to the selected Grade A, B, or C.

* **Recent Inventory Activity**

  * Opens the selected inventory record.

* **Recent Sales Transaction**

  * Opens the selected sales transaction.

* **Recent Planting Record**

  * Opens the selected planting record.

* **Recent Classification Result**

  * Opens the selected classification record.

Dashboard classification rules:

* Classifications Today counts stored classification records created on the current date.
* Classification Results by Grade displays separate counts for Grades A, B, and C.
* Recent Classification Results are ordered from newest to oldest.
* Classification summary data is retrieved from `classification_history`.

---

# Inventory System

The Inventory System manages harvested dragon fruits using the **First-In, First-Out (FIFO)** inventory method. Every harvested batch is recorded and tracked until all available quantities have been sold or manually adjusted. The module ensures inventory accuracy and proper stock rotation while minimizing spoilage.

## Layout

The Inventory page follows a dashboard-style layout.

The upper portion of the screen displays inventory summary cards that provide users with a quick overview of available stocks and harvest activity. Below the summary cards are the search and filtering controls for locating specific inventory records. The main content area contains a scrollable inventory list that displays harvest batches and their remaining quantities. Action buttons are positioned for recording new harvest batches and viewing inventory details.

---

### Inventory Overview

* Total Available Inventory
* Active Harvest Batches
* Inventory by Fruit Size
* Inventory by Quality Grade
* Recently Harvested Batch

UI:

* Statistics Cards
* RecyclerView
* Bottom Navigation
* Search Bar
* Filter Dropdown
* Refresh Indicator

Validation:

* Summary information must be generated from existing inventory records.
* Only active inventory records are included in inventory totals.

User Experience:

* Inventory statistics load automatically when the page opens.
* Pull-to-refresh updates all inventory information.
* Selecting a summary card redirects users to the corresponding inventory records.

System Process:

* Automatically retrieves active inventory records.
* Calculates the total available number of fruit pieces.
* Calculates inventory grouped by fruit size.
* Calculates inventory grouped by quality grade.
* Retrieves the latest harvest batches.
* Displays updated inventory information.

Database Source:

* harvest_batches
* harvest_size_items
* inventory
* inventory_transactions

CRUD Operations:

* SELECT

---

### Inventory List

Displays every active inventory record available within the system.

Each inventory record includes:

* Harvest Batch Number
* Harvest Date
* Fruit Size
* Quality Grade
* Remaining Quantity
* Inventory Status

UI:

* RecyclerView
* Search Bar
* Filter Dropdown
* Status Badge
* View Details Button

Validation:

* Search keyword must match existing inventory records.
* Filter values must use the defined fruit sizes, quality grades, and inventory statuses.

User Experience:

* Inventory records update immediately after search.
* Filters refresh the displayed list without reopening the page.
* Selecting a record opens its detailed information.

System Process:

* Retrieves inventory based on search and filter conditions.
* Sorts inventory according to FIFO order.
* Displays remaining quantities for every harvest batch, fruit size, and quality grade.

Database Source:

* inventory
* harvest_batches
* harvest_size_items

CRUD Operations:

* SELECT

---

### Record Harvest Batch

Allows the Owner/Admin or Staff/Farmer to register newly harvested dragon fruits into the inventory system.

Every harvest creates a new inventory batch which becomes available for future sales.

UI:

* Harvest Entry Form
* Harvest Batch Number Field
* Harvest Date Picker
* Fruit Size Selection
* Quality Grade Selection
* Number of Pieces Field
* Add Harvest Item Button
* Harvest Items Table
* Save Button
* Cancel Button
* Confirmation Dialog

Validation:

* Harvest date is required.
* Number of pieces must be a whole number greater than zero.
* Fruit size must be Extra-Small, Small, Medium, Large, or Jumbo.
* Quality grade must be A, B, or C.
* Every harvest item must contain a fruit size, quality grade, and number of pieces.
* A batch may contain multiple fruit-size and quality-grade combinations.
* Duplicate harvest batch numbers are not allowed.

User Experience:

* Required fields are highlighted when left empty.
* Confirmation dialog appears before saving.
* Success notification is displayed after successful recording.

System Process:

* Creates a new harvest batch.
* Stores every harvest item according to fruit size, quality grade, and number of pieces.
* Generates separate inventory records for each fruit-size and quality-grade combination.
* Registers the batch as available inventory.
* Records a Harvest In inventory transaction for each created inventory record.
* Makes the inventory immediately available for FIFO allocation.

Database Source:

* harvest_batches
* harvest_size_items
* inventory
* inventory_transactions

CRUD Operations:

* INSERT

---

### Inventory Details

Displays complete information for a selected inventory record.

Users can review harvest information, fruit size, quality grade, available quantities, inventory history, and transaction records.

UI:

* Inventory Information Panel
* Harvest Information Card
* Fruit Size and Quality Grade
* Transaction History List
* Back Button

Validation:

* Selected inventory record must exist.

User Experience:

* Details load immediately after record selection.
* Transaction history is displayed in FIFO order, from oldest to newest.

System Process:

* Retrieves complete inventory information.
* Retrieves harvest batch details.
* Retrieves inventory transaction history.
* Sorts inventory transactions from oldest to newest.

Database Source:

* inventory
* inventory_transactions
* harvest_batches
* harvest_size_items

CRUD Operations:

* SELECT

---

### Inventory Adjustment

Allows the Owner/Admin to manually increase or decrease inventory quantities when physical inventory differs from recorded inventory. This workflow also records spoilage.

UI:

* Adjustment Form
* Number of Pieces Field
* Adjustment Type Selection
* Adjustment Reason Field
* Save Button
* Cancel Button

Validation:

* Number of pieces must be a whole number greater than zero.
* Adjustment type must be Increase, Decrease, or Spoilage.
* Adjustment reason is required.
* Inventory cannot become negative.

User Experience:

* Confirmation dialog is displayed before applying adjustments.
* Updated quantities appear immediately after saving.

System Process:

* Updates inventory quantity.
* Records Increase and Decrease as Manual Adjustment transactions with the corresponding adjustment direction.
* Records Spoilage using its corresponding inventory transaction type.
* Recalculates available stock.

Database Source:

* inventory
* inventory_transactions

CRUD Operations:

* UPDATE
* INSERT

---

### Regrade Inventory

Allows the Owner/Admin to downgrade available inventory when quality deterioration or blemishes are identified after initial registration. Grade A may be changed directly to Grade B or Grade C, while Grade B may be changed only to Grade C.

UI:

* Inventory Selection
* Current Grade Display
* New Grade Display
* Number of Pieces Field
* Regrading Reason Field
* Confirmation Dialog
* Save Button
* Cancel Button

Validation:

* A Grade A inventory record may be changed to Grade B or directly to Grade C.
* A Grade B inventory record may be changed only to Grade C.
* Grade changes may follow A → B, A → C, or B → C.
* Number of pieces must be a whole number greater than zero.
* Number of pieces cannot exceed the available piece quantity for the selected inventory record.
* Regrading reason is required.
* Grade C inventory cannot be regraded further.
* Reverse regrading from C to B, C to A, or B to A is not allowed.

User Experience:

* The applicable price for the new grade is previewed before confirmation.
* Updated grade quantities appear immediately after saving.

System Process:

* Decreases the selected source-grade inventory quantity.
* Increases or creates the corresponding target-grade inventory quantity for the same harvest batch and fruit size.
* Records the regrading movement in inventory transaction history.
* Applies the configured price for the new grade to future sales of the regraded quantity.
* Does not change prices or grades on previously completed sales.

Database Source:

* inventory
* inventory_transactions
* harvest_batches
* harvest_size_items
* fruit_prices

CRUD Operations:

* SELECT
* UPDATE
* INSERT

---

### Inventory Transaction History

Displays every inventory movement recorded within the system.

Supported transaction types include:

* Harvest In
* Sale Out
* Manual Adjustment
* Spoilage
* Sale Cancellation Return
* Regrading Out
* Regrading In

UI:

* Transaction History Table
* Search Bar
* Filter Options
* Transaction Status Badge
* View Details Button

Validation:

* Search criteria must match existing transaction records.

User Experience:

* Transactions are displayed from newest to oldest.
* Selecting a transaction opens its complete details.

System Process:

* Retrieves transaction records.
* Sorts records in reverse chronological order.
* Displays transaction history for auditing purposes.

Database Source:

* inventory_transactions

CRUD Operations:

* SELECT

---

## Notes

* Requires authentication.
* Accessible by Owner/Admin and Staff/Farmer.
* Uses First-In, First-Out (FIFO) inventory allocation.
* Supported fruit sizes are Extra-Small, Small, Medium, Large, and Jumbo.
* Every inventory quantity is tracked as a number of fruit pieces by harvest batch, fruit size, and quality grade.
* Piece quantity is the authoritative measure for inventory availability, regrading, adjustments, sale-cancellation restoration, and FIFO deduction.
* Weight is measured and recorded on sales line items for pricing and analytics but does not control inventory deduction.
* An active inventory record has a remaining quantity greater than zero and is available for allocation.
* A harvest batch is active while it contains at least one active inventory record.
* Inventory is automatically updated by harvest and sales transactions.
* Every inventory movement is recorded as an inventory transaction.
* Quality grade is stored as part of each inventory record.
* Inventory may be downgraded through A → B, A → C, or B → C; reverse grade changes are not allowed.
* AI classification may assist grade selection, but it does not automatically create, regrade, or modify inventory records.

# Point-of-Sale (POS)

The Point-of-Sale (POS) module records, processes, and manages dragon fruit sales transactions. It serves as the primary transaction system that converts harvested inventory into recorded sales while ensuring inventory quantities are automatically deducted using the **First-In, First-Out (FIFO)** inventory method. The module also generates **Descriptive Analytics** by summarizing historical sales records, allowing the Owner/Admin to monitor business performance through **Month-over-Month (MoM)** and **Year-over-Year (YoY)** comparisons.

Sales transactions use the following statuses:

* **Draft:** The transaction may be edited or cancelled, has Unpaid payment status, and does not affect inventory or revenue.
* **Completed:** The transaction is finalized, has Paid payment status, affects inventory and revenue, cannot be edited, and may be cancelled by the Owner/Admin.
* **Cancelled:** The transaction is immutable, excluded from revenue, and cannot be cancelled again.

Payment statuses are:

* **Unpaid:** Used by Draft transactions and Draft transactions that are later cancelled.
* **Paid:** Used by Completed transactions after payment is confirmed.
* **Refunded:** Used when a Completed transaction is cancelled after its payment has been returned.

Pricing is based on kilograms:

* All monetary amounts use Philippine Peso (PHP/₱).
* Fruit is sold as individual pieces.
* The selected pieces are weighed together before payment.
* The sales total is calculated as the total measured weight multiplied by the applicable price per kilogram.
* Grade A and Grade B use configured price-per-kilogram schedules based on fruit size.
* Each Grade A and Grade B price schedule supports Extra-Small, Small, Medium, Large, and Jumbo prices.
* Grade C uses one configured price per kilogram for all fruit sizes.
* The applicable price is captured on each sales item so later price changes do not alter completed sales.

---

## Layout

The Point-of-Sale page is designed for fast and efficient sales processing. At the top of the page, summary cards provide an overview of daily and monthly sales performance. Beneath the summary cards is the sales transaction panel where users create new sales. The lower portion of the page contains the sales history table, search controls, and filters for reviewing previous transactions. Analytics are displayed as charts below the transaction history, allowing users to monitor business trends without leaving the page.

---

### Sales Overview

* Today's Sales
* Monthly Revenue
* Total Transactions
* Total Pieces Sold
* Total Kilograms Sold

UI:

* Statistics Cards
* Revenue Summary Card
* Transaction Summary Card
* Bottom Navigation
* Refresh Button

Validation:

* Summary values must be generated from completed sales transactions.
* Cancelled transactions are excluded from revenue summaries.

User Experience:

* Summary cards refresh automatically after every successful transaction.
* Pull-to-refresh updates all sales information.
* Selecting a summary card redirects users to filtered transaction records.

System Process:

* Automatically retrieves completed sales.
* Calculates today's revenue.
* Calculates monthly revenue.
* Counts completed transactions.
* Computes total pieces sold.
* Computes total kilograms sold.

Database Source:

* sales
* sales_items
* inventory

CRUD Operations:

* SELECT

---

### Configure Fruit Prices

Allows the Owner/Admin to configure price-per-kilogram values used by the POS.

UI:

* Grade A Size Price Table
* Grade B Size Price Table
* Grade C Uniform Price Field
* Save Changes Button
* Cancel Button
* Confirmation Dialog

Validation:

* Grade A and Grade B must each have a price for Extra-Small, Small, Medium, Large, and Jumbo.
* Grade C must have exactly one price that applies to every fruit size.
* Every price must be greater than zero.

User Experience:

* Current prices load when the page opens.
* A confirmation dialog appears before price changes are saved.
* New prices apply only to future sales and Draft transactions when they are completed.

System Process:

* Stores the Grade A price per kilogram for each fruit size.
* Stores the Grade B price per kilogram for each fruit size.
* Stores one Grade C price per kilogram for all fruit sizes.
* Preserves the applied price stored on previously Completed sales items.

Database Source:

* fruit_prices

CRUD Operations:

* SELECT
* INSERT
* UPDATE

---

### Process Sales Transaction

Allows the Owner/Admin or Staff/Farmer to record customer purchases.

Each completed transaction automatically updates inventory using FIFO allocation.

UI:

* Customer Information Form
* Customer Name Field
* Customer Address Field
* Customer Contact Number Field
* Customer Email Address Field
* Product Selection
* Fruit Size Selection
* Quality Grade Selection
* Number of Pieces Field
* Total Weight in Kilograms Field
* Applied Price per Kilogram Display
* Add Item Button
* Sales Items Table
* Total Amount Display
* Payment Method Selection
* Cash Amount Tendered Field
* Non-Cash Amount Paid Field
* Change Due Display
* E-Wallet or Bank Transfer Reference Field
* Other E-Wallet Provider Field
* Payment Status Display
* Save as Draft Button
* Save Transaction Button
* Cancel Button
* Confirmation Dialog

Validation:

* Customer name is required.
* Customer address is required.
* Customer contact number is required.
* Customer email address is required.
* Customer email address must use a valid email format.
* Fruit size must be Extra-Small, Small, Medium, Large, or Jumbo and must exist in inventory.
* Quality grade must be A, B, or C and must exist in inventory.
* Number of pieces must be a whole number greater than zero.
* Total weight must be greater than zero kilograms.
* Number of pieces cannot exceed the available pieces in matching inventory.
* Each unique fruit-size and quality-grade combination must be recorded as a separate sales line item.
* Applied price per kilogram must be greater than zero.
* Payment method must be Cash, GCash, Maya, Other E-Wallet, or Bank Transfer when completing a transaction.
* For Cash payments, amount tendered must be at least the total amount.
* Other E-Wallet requires the provider name.
* For GCash, Maya, Other E-Wallet, or Bank Transfer, a payment reference is required and the amount paid must equal the total amount.
* Draft transactions have Unpaid payment status.
* Completed transactions have Paid payment status.

User Experience:

* Each line-item subtotal updates automatically after its total weight is entered.
* The transaction total is the sum of all line-item subtotals.
* The system displays the configured price after fruit size and quality grade are selected.
* Change due updates automatically for Cash payments.
* Confirmation dialog appears before processing payment.
* Saving as a draft displays a confirmation message without changing inventory.
* Successful transactions display a confirmation message.
* Insufficient inventory displays an error message.

System Process:

* When saving as a draft, creates a sales transaction with Draft status without allocating or deducting inventory.
* When completing a transaction, validates the available piece quantity for every sales line item.
* Retrieves the configured price per kilogram for each line item's quality grade and fruit size.
* Uses the single Grade C price regardless of fruit size.
* Calculates each sales line-item subtotal as total measured weight multiplied by the applied price per kilogram.
* Calculates the transaction total as the sum of all line-item subtotals.
* For each line item, retrieves the oldest available matching harvest batch by fruit size and quality grade.
* Applies FIFO inventory deduction by number of pieces for each matching line item.
* Creates a new Completed transaction or changes an existing Draft transaction to Completed.
* For a Completed transaction, stores each line item's number of pieces, total measured weight, fruit size, quality grade, applied price per kilogram, and subtotal.
* Stores currency, payment method, cash amount tendered or non-cash amount paid, change due, payment reference when applicable, and payment status.
* For a Completed transaction, decreases inventory by the allocated number of pieces.
* For a Completed transaction, records inventory movement.
* Refreshes sales summaries after completion.

Database Source:

* sales
* sales_items
* inventory
* inventory_transactions
* harvest_batches
* fruit_prices

CRUD Operations:

* INSERT
* UPDATE
* SELECT

---

### Sales History

Displays all recorded sales transactions.

Each transaction contains complete information regarding the sale and its corresponding inventory allocation.

UI:

* Sales Transaction Table
* Search Bar
* Filter Options
* Date Range Picker
* Transaction Status Badge
* View Details Button

Validation:

* Search keywords must match existing sales records.
* Selected date range must be valid.
* Transaction status filters must use Draft, Completed, or Cancelled.

User Experience:

* Search updates immediately.
* Filters display matching transactions without reloading the page.
* Selecting a transaction displays complete transaction details.

System Process:

* Retrieves sales transactions.
* Retrieves customer information.
* Retrieves the number of pieces sold and total measured weight.
* Retrieves payment totals.
* Displays transaction history in reverse chronological order.

Database Source:

* sales
* sales_items

CRUD Operations:

* SELECT

---

### Sales Transaction Details

Displays complete information for a selected sales transaction.

The page allows users to review purchased items, inventory allocation, customer information, and payment summary.

UI:

* Sales Information Panel
* Customer Information Card
* Purchased Items Table
* Payment Summary Card
* Payment Method
* Cash Amount Tendered or Non-Cash Amount Paid
* Change Due
* E-Wallet or Bank Transfer Reference
* Payment Status
* Inventory Allocation Details
* Back Button

Validation:

* Selected transaction must exist.

User Experience:

* Details load immediately after selection.
* Users can easily review the complete transaction before returning to the transaction list.

System Process:

* Retrieves complete transaction information.
* Retrieves customer information.
* Retrieves sold inventory records.
* Retrieves payment summary.

Database Source:

* sales
* sales_items
* inventory

CRUD Operations:

* SELECT

---

### Update Sales Transaction

Allows the Owner/Admin to modify a sales transaction while it has Draft status.

UI:

* Sales Edit Form
* Fruit Size Selection
* Quality Grade Selection
* Number of Pieces Field
* Total Weight in Kilograms Field
* Applied Price per Kilogram Display
* Save Changes Button
* Cancel Button

Validation:

* Transaction must have Draft status.
* Number of pieces must be a whole number greater than zero.
* Total weight must be greater than zero kilograms.
* Updated number of pieces must not exceed available matching inventory.
* Fruit size and quality grade must match an inventory record.
* The applicable configured price must be greater than zero.

User Experience:

* Modified values are previewed before saving.
* Confirmation dialog appears before updating.

System Process:

* Updates Draft sales information.
* Refreshes the applicable price from the active fruit-price configuration.
* Recalculates transaction total.
* Does not allocate inventory or create inventory movements.

Database Source:

* sales
* sales_items
* inventory
* fruit_prices

CRUD Operations:

* UPDATE
* SELECT

---

### Cancel Sales Transaction

Allows the Owner/Admin to cancel a sales transaction with Draft or Completed status.

UI:

* Cancel Transaction Button
* Confirmation Dialog
* Cancellation Reason Field
* Refund Confirmation
* Refund Reference Field

Validation:

* Selected transaction must exist.
* Cancellation reason is required.
* Transaction must have Draft or Completed status.
* A transaction with Cancelled status cannot be cancelled again.
* Cancelling a Completed transaction requires confirmation that payment was refunded.
* Cancelling an e-wallet or bank-transfer transaction requires a refund reference.

User Experience:

* Warning dialog appears before cancellation.
* Users receive confirmation after successful cancellation.

System Process:

* Updates the transaction status to Cancelled.
* For a Draft transaction, retains Unpaid payment status and does not change inventory.
* For a Completed transaction, restores deducted inventory quantities and records a Sale Cancellation Return inventory transaction.
* For a Completed transaction, stores the refund confirmation and refund reference when applicable.
* For a Completed transaction, records the payment status as Refunded after the refund is confirmed.
* Updates revenue summaries.

Database Source:

* sales
* sales_items
* inventory
* inventory_transactions

CRUD Operations:

* UPDATE
* INSERT
* SELECT

---

## Sales Analytics

The Sales Analytics section provides descriptive summaries of historical sales transactions. It enables the Owner/Admin to evaluate business performance using historical sales data without generating forecasts or predictions.

---

### Daily Sales Analysis

Displays sales performance for a selected day.

UI:

* Daily Revenue Chart
* Daily Summary Cards
* Sales by Fruit Size and Grade Table
* Date Picker

Summary figures:

* Total Revenue
* Completed Transactions
* Total Pieces Sold
* Total Kilograms Sold
* Average Transaction Value

Validation:

* Selected date must be valid.
* Only Completed transactions are included.

User Experience:

* Charts, figures, and tables update automatically when a date is selected.
* Users can review sales distribution by fruit size and quality grade.

System Process:

* Retrieves Completed sales for the selected date.
* Calculates daily revenue, transaction count, pieces sold, kilograms sold, and average transaction value.
* Groups daily sales by fruit size and quality grade.
* Displays the daily chart, summary figures, and table.

Database Source:

* sales
* sales_items

CRUD Operations:

* SELECT

---

### Monthly Sales and Month-over-Month (MoM) Analysis

Displays sales performance for a selected month and compares it with the immediately preceding month.

UI:

* Daily Sales Trend Chart
* Monthly Comparison Card
* Monthly Summary Cards
* Daily Summary Table
* Month Selector

Summary figures:

* Total Revenue
* Completed Transactions
* Total Pieces Sold
* Total Kilograms Sold
* Average Transaction Value
* Month-over-Month Percentage Change

Validation:

* Requires historical sales records from at least two months.
* Only Completed transactions are included.

User Experience:

* Charts, figures, and tables update automatically when a month is selected.
* Users can quickly identify increases or decreases in sales.

System Process:

* Retrieves Completed sales for the selected month and immediately preceding month.
* Calculates monthly revenue, transaction count, pieces sold, kilograms sold, and average transaction value.
* Calculates the Month-over-Month percentage change.
* Groups the selected month's sales totals by day.
* Displays the monthly chart, summary figures, daily table, and historical comparison.

Database Source:

* sales
* sales_items

CRUD Operations:

* SELECT

---

### Annual Sales and Year-over-Year (YoY) Analysis

Displays sales performance for a selected year and compares it with the immediately preceding year.

UI:

* Annual Revenue Chart
* Year Selector
* Annual Summary Cards
* Monthly Summary Table

Summary figures:

* Total Revenue
* Completed Transactions
* Total Pieces Sold
* Total Kilograms Sold
* Average Transaction Value
* Year-over-Year Percentage Change

Validation:

* Requires historical sales records from multiple years.
* Only Completed transactions are included.

User Experience:

* Users can compare yearly business performance through interactive charts.
* Selecting a year refreshes the charts, figures, tables, and comparison.

System Process:

* Retrieves Completed sales for the selected year and immediately preceding year.
* Calculates annual revenue, transaction count, pieces sold, kilograms sold, and average transaction value.
* Calculates the Year-over-Year percentage change.
* Groups the selected year's sales totals by month.
* Displays the annual chart, summary figures, monthly table, and yearly comparison.

Database Source:

* sales
* sales_items

CRUD Operations:

* SELECT

---

### Sales Reports

Displays summarized historical sales information using daily, monthly, or annual groupings.

Reports may be filtered by transaction date and reporting period for easier business review.

UI:

* Report Table
* Date Range Picker
* Period Grouping Selector (Daily, Monthly, Annual)
* Fruit Size Filter
* Quality Grade Filter
* Search Bar

Report table columns:

* Period
* Completed Transactions
* Total Pieces Sold
* Total Kilograms Sold
* Total Revenue
* Average Transaction Value

Validation:

* Date range must be valid.
* Period grouping must be Daily, Monthly, or Annual.
* Fruit size filters must use Extra-Small, Small, Medium, Large, or Jumbo.
* Quality grade filters must use A, B, or C.
* Only Completed transactions are included.

User Experience:

* Reports update immediately after selecting a date range.
* Users can easily review historical transactions.

System Process:

* Retrieves historical sales records.
* Groups sales by the selected daily, monthly, or annual period.
* Calculates transaction count, pieces sold, kilograms sold, revenue, and average transaction value for each period.
* Displays summarized sales information in the report table.

Database Source:

* sales
* sales_items

CRUD Operations:

* SELECT

---

## Notes

* Requires authentication.
* Sales processing, sales history, and transaction details are accessible by Owner/Admin and Staff/Farmer.
* Fruit-price configuration, sales updates, sales cancellations, Sales Analytics, and Sales Reports are accessible only by Owner/Admin.
* Automatically applies **FIFO** inventory deduction.
* Automatically updates inventory after every completed sale.
* Draft transactions do not affect inventory or revenue.
* Completed transactions cannot be edited.
* Draft and Completed transactions may be cancelled only by the Owner/Admin.
* Cancelled transactions are immutable and excluded from revenue summaries.
* Generates **Descriptive Analytics** only.
* Supports daily, monthly, and annual charts, summary figures, and tables.
* Supports **Month-over-Month (MoM)** comparison.
* Supports **Year-over-Year (YoY)** comparison.
* Does not perform predictive analytics or sales forecasting.
* Revenue summaries are generated solely from recorded sales transactions.

# Multi-Class Classification

The Multi-Class Classification module provides AI-assisted grading of **Moroccan Red Dragon Fruit** using **TensorFlow Lite (MobileNetV2)**. The module enables users to capture or upload an image of a dragon fruit and automatically classify its quality into predefined grade categories. The classification process assists users in performing consistent quality assessment while reducing manual grading variability. This module functions independently from the inventory and Point-of-Sale modules, serving solely as a quality evaluation tool.

The predefined quality grades are:

* **A — Good Quality (near perfect)**
* **B — OK**
* **C — Blemished**

---

## Layout

The Multi-Class Classification page follows a simple and user-friendly layout designed for quick image analysis. At the top of the screen is the image preview area, where users can view the selected dragon fruit image before processing. Below the preview are the camera and gallery selection controls. Once an image has been selected, the classification button becomes available. The lower portion of the screen displays the AI classification result together with its confidence score and classification history for future reference.

---

### Capture Dragon Fruit Image

Allows users to capture a dragon fruit image using the device's camera for AI-based quality classification.

UI:

* Camera Preview
* Capture Button
* Retake Button
* Image Preview
* Back Button

Validation:

* Camera permission must be granted.
* Image capture must complete successfully.
* Only one image is processed per classification request.

User Experience (UX):

* Live camera preview is displayed before capture.
* Users may retake the image until satisfied.
* Captured image is immediately displayed for review.
* Clear prompts are shown when camera permission is denied.

System Process:

* Opens the device camera.
* Captures the selected image.
* Stores the captured image temporarily.
* Displays the image preview.
* Prepares the image for AI preprocessing.

Database Source:

* None; the image remains temporary until classification is performed.

CRUD Operations:

* None

---

### Upload Dragon Fruit Image

Allows users to select an existing dragon fruit image from the device gallery for classification.

UI:

* Upload Image Button
* Gallery Picker
* Image Preview
* Remove Image Button

Validation:

* Selected file must be a supported image format.
* Image selection must complete successfully.
* Only one image is processed at a time.

User Experience (UX):

* Users may replace the selected image before classification.
* Selected image is immediately previewed.
* Invalid image formats display an informative error message.

System Process:

* Opens the device gallery.
* Retrieves the selected image.
* Displays image preview.
* Prepares image for preprocessing.

Database Source:

* None; the image remains temporary until classification is performed.

CRUD Operations:

* None

---

### Perform AI Classification

Processes the selected dragon fruit image using the MobileNetV2 TensorFlow Lite model to determine the fruit's quality classification.

UI:

* Classify Button
* Loading Indicator
* Processing Status
* Cancel Button

Validation:

* An image must be selected before classification.
* AI model must be successfully loaded.
* Classification request must contain a valid image.

User Experience (UX):

* Loading animation is displayed while processing.
* Users are prevented from initiating multiple classifications simultaneously.
* Clear error messages are shown if processing fails.

System Process:

* Loads the MobileNetV2 TensorFlow Lite model.
* Preprocesses the selected image.
* Performs image inference.
* Determines the highest-confidence class.
* Calculates the confidence percentage.
* Returns the predicted quality grade.
* Stores the classification result and image reference in classification history.

Database Source:

* classification_history

CRUD Operations:

* INSERT
* SELECT

---

### Classification Result

Displays the quality classification produced by the AI model.

The result allows users to review the predicted quality grade together with the model's confidence score.

UI:

* Classification Result Card
* Grade Badge
* Confidence Percentage
* Classified Image Preview
* New Scan Button

Validation:

* Classification result must exist.
* Confidence value must be successfully generated.

User Experience (UX):

* Results are displayed immediately after inference.
* Confidence score is presented using an easily understandable percentage.
* Users can immediately begin another classification without leaving the page.

System Process:

* Retrieves the generated prediction.
* Displays the predicted class.
* Displays confidence score.
* Associates the displayed image with the generated result.

Database Source:

* classification_history

CRUD Operations:

* SELECT

---

### Classification History

Displays previously processed classification records for review.

Users can revisit previous AI classification results without performing another scan.

UI:

* Classification History List
* Search Bar
* Date Filter
* View Details Button
* RecyclerView

Validation:

* Search keywords must match existing records.
* Date filters must contain valid dates.

User Experience (UX):

* Most recent classifications appear first.
* Selecting a history record opens its complete details.
* Search results update immediately while typing.

System Process:

* Retrieves historical classification records.
* Sorts records in reverse chronological order.
* Displays stored prediction results.

Database Source:

* classification_history

CRUD Operations:

* SELECT

---

### Classification Details

Displays the complete information for a previously classified dragon fruit image.

UI:

* Image Preview
* Classification Information Card
* Confidence Score
* Classification Date
* Back Button

Validation:

* Selected classification record must exist.

User Experience (UX):

* Details load immediately after record selection.
* Users can easily compare previous classifications by returning to the history list.

System Process:

* Retrieves the selected classification record.
* Displays the associated image.
* Displays the predicted quality class.
* Displays the recorded confidence score.
* Displays the classification timestamp.

Database Source:

* classification_history

CRUD Operations:

* SELECT

---

## Notes
* This is a **standalone module** that does not automatically update inventory or sales records.
* Requires authentication.
* Accessible by both **Owner/Admin** and **Staff/Farmer**.
* Uses **TensorFlow Lite** for on-device inference.
* Uses the **MobileNetV2** architecture for image classification.
* Performs **Multi-Class Classification** only.
* Does **not** perform descriptive analytics, predictive analytics, or inventory computation.
* Classification results are intended to assist quality assessment and do not automatically modify inventory or sales records.
* Image processing is performed locally on the Android device using the integrated AI model.

# Plant Guidance & Plant Cycle Monitoring

The Plant Guidance & Plant Cycle Monitoring module assists the Owner/Admin and Staff/Farmer in recording planting groups and monitoring their growth lifecycle. Monitoring is performed per planting group rather than per individual plant. The module provides a structured timeline from grafting to maturity by calculating elapsed and remaining days from the recorded grafting date. Each planting group reaches estimated maturity 45 days after grafting.

Growth stages are time-based:

* **Newly Grafted:** Days 0–5 after grafting.
* **Intermediate Growth Stage:** Days 6–30 after grafting.
* **Near Maturity:** Days 31–45 after grafting.

**Ready for Harvest** is a monitoring status applied on day 45. A planting group on day 45 remains in the Near Maturity growth stage while also having Ready for Harvest status.

---

## Layout

The Plant Guidance page provides an organized overview of all monitored planting groups. The upper portion of the screen displays summary cards showing the overall planting status. Below the summary cards are search and filtering controls for locating specific planting-group records. The main content area displays monitored planting groups together with their current growth stage, estimated maturity, and remaining days. Selecting a record opens detailed lifecycle information for that planting group.

---

### Plant Monitoring Overview

* Total Active Planting Groups
* Newly Grafted Groups
* Groups Near Maturity
* Groups Ready for Harvest

UI:

* Statistics Cards
* RecyclerView
* Bottom Navigation
* Search Bar
* Refresh Button

Validation:

* Summary values must be generated from active planting records.
* Only active planting-group records are included in monitoring summaries.

User Experience (UX):

* Summary cards automatically update whenever planting records are added or modified.
* Pull-to-refresh retrieves the latest monitoring information.
* Selecting a summary card filters the corresponding planting-group records.

System Process:

* Automatically retrieves all active planting records.
* Calculates the number of monitored planting groups.
* Determines planting groups approaching maturity.
* Determines planting groups that have reached the estimated harvest stage.
* Updates summary information.

Database Source:

* planting_records
* plant_monitoring

CRUD Operations:

* SELECT

---

### Record Planting Group

Allows the Owner/Admin or Staff/Farmer to register a dragon fruit planting group for lifecycle monitoring.

UI:

* Planting Group Registration Form
* Grafting Date Picker
* Variety Selection
* Location Field
* Number of Plants Field
* Save Button
* Reset Button
* Cancel Button

Validation:

* Grafting date is required.
* Number of plants must be greater than zero.
* Required fields must not be empty.
* Future grafting dates are not allowed.

User Experience (UX):

* Required fields are highlighted when incomplete.
* Confirmation dialog appears before saving.
* Successful registration displays a confirmation message.
* A newly recorded planting group immediately appears in the monitoring list.

System Process:

* Stores the planting-group record.
* Sets the estimated maturity date to 45 days after the grafting date.
* Calculates the initial monitoring schedule.
* Registers the planting group for lifecycle tracking.
* Makes the record available for future monitoring.

Database Source:

* planting_records

CRUD Operations:

* INSERT

---

### Plant Monitoring List

Displays every active planting-group record currently being monitored.

Each monitored record includes:

* Grafting Date
* Variety
* Number of Plants
* Current Growth Stage
* Estimated Maturity Date
* Remaining Days
* Monitoring Status

UI:

* RecyclerView
* Search Bar
* Filter Dropdown
* Status Badge
* View Details Button

Validation:

* Search keyword must match an existing planting-group record.
* Selected filter must correspond to available monitoring categories.

User Experience (UX):

* Search updates the displayed records immediately.
* Filters refresh the monitoring list without reopening the page.
* Selecting a record displays detailed lifecycle information.

System Process:

* Retrieves all monitored planting-group records.
* Calculates elapsed days from the grafting date.
* Calculates remaining days in the 45-day maturity period.
* Displays current monitoring status.

Database Source:

* planting_records
* plant_monitoring

CRUD Operations:

* SELECT

---

### Plant Lifecycle Monitoring

Displays the calculated lifecycle progress of a selected planting group based on its recorded grafting date.

UI:

* Lifecycle Progress Card
* Growth Stage Indicator
* Countdown Display
* Estimated Maturity Card
* Progress Timeline

Validation:

* Selected planting-group record must exist.
* Grafting date must be valid.

User Experience (UX):

* Lifecycle information updates automatically each day.
* Countdown clearly indicates the remaining time before estimated maturity.
* Progress timeline visually represents plant development.

System Process:

* Calculates elapsed days since grafting.
* Determines the current growth stage using the defined day ranges.
* Calculates the remaining days in the 45-day maturity period.
* Updates lifecycle progress.

Database Source:

* planting_records
* plant_monitoring

CRUD Operations:

* SELECT

---

### Plant Record Details

Displays complete information regarding an individual planting-group record.

UI:

* Plant Information Card
* Lifecycle Summary
* Planting Details
* Monitoring History
* Back Button

Validation:

* Selected planting-group record must exist.

User Experience (UX):

* Complete information loads immediately after record selection.
* Users can easily return to the monitoring list.

System Process:

* Retrieves the selected planting-group record.
* Retrieves monitoring history.
* Displays calculated lifecycle information.

Database Source:

* planting_records
* plant_monitoring

CRUD Operations:

* SELECT

---

### Update Plant Monitoring Record

Allows the Owner/Admin to modify planting-group information when corrections are necessary.

UI:

* Edit Planting Group Form
* Grafting Date Picker
* Number of Plants Field
* Save Changes Button
* Cancel Button

Validation:

* Required fields must not be empty.
* Number of plants must be greater than zero.
* Grafting date must remain valid.

User Experience (UX):

* Updated information is previewed before saving.
* Confirmation dialog appears before applying changes.
* Monitoring information refreshes immediately after updating.

System Process:

* Updates the planting-group record.
* Recalculates lifecycle progress.
* Recomputes the estimated maturity date as 45 days after the grafting date.
* Refreshes monitoring summaries.

Database Source:

* planting_records
* plant_monitoring

CRUD Operations:

* UPDATE

---

### Remove Planting Group Record

Allows the Owner/Admin to soft delete an inactive or incorrectly recorded planting-group entry.

UI:

* Soft Delete Button
* Confirmation Dialog
* Deletion Reason Field

Validation:

* Selected record must exist.
* Confirmation is required before deletion.
* Deletion reason is required.

User Experience (UX):

* Warning message appears before deletion.
* Users receive confirmation after the record has been removed.

System Process:

* Marks the selected planting-group record as deleted without physically removing it.
* Stores the deletion reason, deletion timestamp, and Owner/Admin account that performed the action.
* Refreshes monitoring summaries.
* Updates the monitoring list.

Database Source:

* planting_records

CRUD Operations:

* UPDATE

---

## Notes

* Requires authentication.
* Accessible by both **Owner/Admin** and **Staff/Farmer**.
* An active planting-group record is a record that has not been marked inactive or soft deleted.
* Soft-deleted planting-group records are excluded from active monitoring views but retained for audit purposes.
* Monitoring is performed per planting group; the number of plants is stored as an attribute of the group.
* The grafting date is the start of lifecycle monitoring.
* Estimated maturity occurs 45 days after the grafting date.
* Automatically calculates elapsed days, remaining days, and estimated maturity.
* Functions as a **guidance and monitoring tool** rather than a predictive system.
* Does not use Artificial Intelligence or Machine Learning.
* Does not automatically generate harvest records or inventory entries.
* Plant monitoring information is maintained independently from Inventory, POS, and Multi-Class Classification modules while supporting overall farm management.
