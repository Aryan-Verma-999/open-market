import express from 'express';
import { prisma } from '@/lib/database';
import { redis } from '@/lib/redis';

const router = express.Router();

/**
 * Get all categories with hierarchy
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
    const { includeInactive = 'false', flat = 'false' } = req.query;
    
    const cacheKey = `categories:${includeInactive}:${flat}`;
    
    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }
    } catch (cacheError) {
      console.error('Redis cache error:', cacheError);
    }

    const where: any = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where: includeInactive !== 'true' ? { isActive: true } : {},
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: {
                listings: {
                  where: {
                    status: 'LIVE',
                    isActive: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            listings: {
              where: {
                status: 'LIVE',
                isActive: true
              }
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    let result;
    if (flat === 'true') {
      // Return flat list of all categories
      result = categories;
    } else {
      // Filter to only root categories (no parent) for hierarchical view
      result = categories.filter((cat: any) => !cat.parentId);
    }

    // Cache the result for 10 minutes
    try {
      await redis.setEx(cacheKey, 600, JSON.stringify(result));
    } catch (cacheError) {
      console.error('Redis cache set error:', cacheError);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_CATEGORIES_FAILED',
        message: error.message || 'Failed to fetch categories'
      }
    });
  }
});

/**
 * Get popular categories based on listing count
 * GET /api/categories/popular
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 50'
        }
      });
    }

    const cacheKey = `categories:popular:${limitNum}`;
    
    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }
    } catch (cacheError) {
      console.error('Redis cache error:', cacheError);
    }

    const popularCategories = await prisma.category.findMany({
      where: {
        isActive: true,
        listings: {
          some: {
            status: 'LIVE',
            isActive: true
          }
        }
      },
      include: {
        _count: {
          select: {
            listings: {
              where: {
                status: 'LIVE',
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        listings: {
          _count: 'desc'
        }
      },
      take: limitNum
    });

    // Cache for 30 minutes
    try {
      await redis.setEx(cacheKey, 1800, JSON.stringify(popularCategories));
    } catch (cacheError) {
      console.error('Redis cache set error:', cacheError);
    }

    res.json({
      success: true,
      data: popularCategories
    });
  } catch (error: any) {
    console.error('Error fetching popular categories:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_POPULAR_CATEGORIES_FAILED',
        message: error.message || 'Failed to fetch popular categories'
      }
    });
  }
});

/**
 * Get category breadcrumb path
 * GET /api/categories/:identifier/breadcrumb
 */
router.get('/:identifier/breadcrumb', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find category by ID or slug
    let category = await prisma.category.findUnique({
      where: { id: identifier },
      include: { parent: true }
    });

    if (!category) {
      category = await prisma.category.findUnique({
        where: { slug: identifier },
        include: { parent: true }
      });
    }

    if (!category) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // Build breadcrumb path
    const breadcrumb = [];
    let current: any = category;

    while (current) {
      breadcrumb.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug
      });

      if (current.parentId) {
        current = await prisma.category.findUnique({
          where: { id: current.parentId },
          include: { parent: true }
        });
      } else {
        current = null;
      }
    }

    res.json({
      success: true,
      data: {
        breadcrumb,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching category breadcrumb:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_BREADCRUMB_FAILED',
        message: error.message || 'Failed to fetch category breadcrumb'
      }
    });
  }
});

/**
 * Get category by ID or slug
 * GET /api/categories/:identifier
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by ID first, then by slug
    let category = await prisma.category.findUnique({
      where: { id: identifier },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        parent: true,
        _count: {
          select: {
            listings: {
              where: {
                status: 'LIVE',
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!category) {
      category = await prisma.category.findUnique({
        where: { slug: identifier },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          parent: true,
          _count: {
            select: {
              listings: {
                where: {
                  status: 'LIVE',
                  isActive: true
                }
              }
            }
          }
        }
      });
    }

    if (!category) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_CATEGORY_FAILED',
        message: error.message || 'Failed to fetch category'
      }
    });
  }
});

export default router;