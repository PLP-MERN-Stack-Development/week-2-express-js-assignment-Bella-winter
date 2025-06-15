// server.js - Starter Express server for Week 2 assignment

// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// custom error classes
class validationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}
class AuthrenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

// async error wrapper function
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

//custom logger middleware
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString(); 
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.headers['user-agent'] || 'Unknown User Agent';
  console.log(`[${timestamp}] ${method} request to ${url} - User Agent: ${userAgent}`);
  req.startTime = Date.now();
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - req.startTime;
    console.log(`[${timestamp}] ${method} request to ${url} completed in ${duration}ms`);
    originalSend.call(this, body);
  };
  next();
}
  // Custom authentication middleware
const authenticationApiKey = (req, res, next) => {

  const apiKey = req.headers['x-api-key'];
  const validApiKeys = ['your-secret-api-key-123', 'admin-key-456'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required. Please enter a valid API key'
    });
  }
  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key. Access denied.'
    });
  }
  req.apiKey = apiKey;
  req.isAdmin = apiKey.includes('admin'); 
  next();
};
// Validation middleware for product data
const validateProduct = (req, res, next) => {

  const { name, price, category } = req.body;
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Name is required and must be a non-empty string.');
  }

  if (!price || typeof price !== 'number' || price <= 0) {
    errors.push('Price is required and must be a positive number.');
  } 
  if (!category || typeof category !== 'string' || category.trim() === '') {
    errors.push('Category is required and must be a non-empty string.');
  }
  if (req.body.description && typeof req.body.description !== 'string') {
    errors.push('Description must be a string if provided.');
  }
  const validCategories = ['electronics', 'clothing', 'books', 'home'];
  if (category && !validCategories.includes(category.toLowerCase())) {
    errors.push(`Category must be one of the following: ${validCategories.join(', ')}.`);
  }
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }
  // Sanitize data
  req.body.name = name.trim();

  req.body.category = category.trim().toLowerCase();
  if (req.body.description) {
    req.body.description = req.body.description.trim();
  }
  next();
}


// Middleware setup
app.use(bodyParser.json());
app.use(logger);




// Sample in-memory products database
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false
  }
];


// Root route
app.get('/', (req, res) => {
  res.send('Hello World');
});



// TODO: Implement the following routes:
// GET /api/products - Get all products

app.get('/api/products', (req,res) => {
  try{
    res.json({
      success: true,
      data: products,
      count: products.length,
      message: 'Products retrieved successfully'
    });
  }catch (error){
    res.status(500).json({
      success: false,
      message: 'server error'
    });
  }
  });
// GET /api/products/:id - Get a specific product

app.get('/api/products/:id', (req, res) => {
  try{
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
   } catch (error) {
      res.sendStatus(500),json({
        success: false,
        message: 'Server error while retrieving product'
      });
  }
});

// POST /api/products - Create a new product

app.post('/api/products', (req, res) => {
  try{
    console.log('Request body:', req.body);
    const { name, description, price, category, inStock } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required'
      });
    }

    // Create new product
    const newProduct = {
      id: uuidv4(),
      name,
      description: description || '',
      price:  parseFloat(price),
      category,
      inStock: inStock !== undefined ? inStock : true 
    };

    products.push(newProduct);
    console.log('New product created:', newProduct);

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
});
// PUT /api/products/:id - Update a product

app.put('/api/products/:id', (req, res) => {
  try{
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    const { name, description, price, category, inStock } = req.body;
    //update product
    products[productIndex] = {
      ...products[productIndex],
      name: name || products[productIndex].name,
      description: description || products[productIndex].description,
      price: price !== undefined ? parseFloat(price) : products[productIndex].price,
      category: category || products[productIndex].category,
      inStock: inStock !== undefined ? inStock : products[productIndex].inStock,
      updatedAt: new Date().toISOString()
    };
    res.json({
      success: true,
      data: products[productIndex],
      message: 'Product updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
});


// DELETE /api/products/:id - Delete a product

app.delete('/api/products/:id', (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    // Remove product from the array
    const deletedProduct = products.splice(productIndex, 1[0]);
    res.json({
      success: true,
      data: deletedProduct[0],
      message: 'Product deleted successfully'
    });
  }catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
});

// get produvts with filtering
app.get('api/products', asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 10, instock} = req.query;
  let filteredProducts = [...products];

  // Filter by category
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  //search by name
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
  } 
  // filter by stock atatus
  if (instock !== undefined) {
    const inStock = instock.toLowerCase() === 'true';
    filteredProducts = filteredProducts.filter(p => p.inStock === inStock);
  }
  // Pagination
  const limitNum = parseInt(limit);
  const pageNumber = parseInt(page);
  const startIndex = (pageNumber - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

//pagination information
 const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / limitNum);
  const hasNextPage = endIndex < totalProducts;
  const hasPreviousPage = startIndex > 0;

  res.json({
    success: true,
    data: paginatedProducts,
    pagination: {
   currentPage: pageNumber,
    totalProducts,
    totalPages,
    productsPerPage: limitNum,
    hasNextPage,
    hasPreviousPage
    }
  });
}));

// GET /api/products/search - Dedicated search endpoint
app.get('/api/products/search', asyncHandler(async (req, res) => {
  const { q, category } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query parameter "q" is required');
  }
  
  const searchTerm = q.toLowerCase();
  let results = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm) || 
    p.description.toLowerCase().includes(searchTerm)
  );
  
  // Optional category filter
  if (category) {
    results = results.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  res.json({
    success: true,
    data: results,
    searchTerm: q,
    count: results.length
  });
}));

// GET /api/products/stats - Product statistics
app.get('/api/products/stats', asyncHandler(async (req, res) => {
  const stats = {
    totalProducts: products.length,
    inStock: products.filter(p => p.inStock).length,
    outOfStock: products.filter(p => !p.inStock).length,
    categoryBreakdown: {},
    averagePrice: 0,
    priceRange: {
      min: 0,
      max: 0
    }
  };
  
  // Category breakdown
  products.forEach(product => {
    stats.categoryBreakdown[product.category] = 
      (stats.categoryBreakdown[product.category] || 0) + 1;
  });
  
  // Price statistics
  if (products.length > 0) {
    const prices = products.map(p => p.price);
    stats.averagePrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
    stats.priceRange.min = Math.min(...prices);
    stats.priceRange.max = Math.max(...prices);
  }
  
  res.json({
    success: true,
    data: stats
  });
}));

// GET /api/products/:id - Get a specific product
app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  res.json({
    success: true,
    data: product
  });
}));

// POST /api/products - Create a new product
app.post('/api/products', asyncHandler(authenticateApiKey), validateProduct, asyncHandler(async (req, res) => {
  const newProduct = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description || '',
    price: req.body.price,
    category: req.body.category,
    inStock: req.body.inStock !== undefined ? req.body.inStock : true
  };
  
  products.push(newProduct);
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: newProduct
  });
}));

// PUT /api/products/:id - Update a product
app.put('/api/products/:id', asyncHandler(authenticateApiKey), validateProduct, asyncHandler(async (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  
  if (productIndex === -1) {
    throw new NotFoundError('Product not found');
  }
  
  products[productIndex] = {
    ...products[productIndex],
    name: req.body.name,
    description: req.body.description || products[productIndex].description,
    price: req.body.price,
    category: req.body.category,
    inStock: req.body.inStock !== undefined ? req.body.inStock : products[productIndex].inStock
  };
  
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: products[productIndex]
  });
}));

// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', asyncHandler(authenticateApiKey), asyncHandler(async (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  
  if (productIndex === -1) {
    throw new NotFoundError('Product not found');
  }
  
  const deletedProduct = products.splice(productIndex, 1)[0];
  res.json({
    success: true,
    message: 'Product deleted successfully',
    data: deletedProduct
  });
}));

// Global Error Handling Middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.message);
  console.error('Stack trace:', err.stack);
  
  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  } else if (err.name === 'AuthenticationError') {
    statusCode = 401;
  } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
   console.log('Available endpoints:');
  console.log('  GET    /api/products           - List products with filtering & pagination');
  console.log('  GET    /api/products/search    - Search products');
  console.log('  GET    /api/products/stats     - Product statistics');
  console.log('  GET    /api/products/:id       - Get specific product');
  console.log('  POST   /api/products           - Create product (requires auth)');
  console.log('  PUT    /api/products/:id       - Update product (requires auth)');
  console.log('  DELETE /api/products/:id       - Delete product (requires auth)');
});


// Export the app for testing purposes
module.exports = app;