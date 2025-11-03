import { listingService } from '../services/listingService';
import { Condition } from '@prisma/client';

describe('Listing Management', () => {
  describe('Listing Service', () => {
    it('should have getListings method', () => {
      expect(typeof listingService.getListings).toBe('function');
    });

    it('should have createListing method', () => {
      expect(typeof listingService.createListing).toBe('function');
    });

    it('should have updateListing method', () => {
      expect(typeof listingService.updateListing).toBe('function');
    });

    it('should have deleteListing method', () => {
      expect(typeof listingService.deleteListing).toBe('function');
    });

    it('should have getListingById method', () => {
      expect(typeof listingService.getListingById).toBe('function');
    });
  });

  describe('Condition enum', () => {
    it('should have expected condition values', () => {
      expect(Condition.NEW).toBe('NEW');
      expect(Condition.LIKE_NEW).toBe('LIKE_NEW');
      expect(Condition.GOOD).toBe('GOOD');
      expect(Condition.FAIR).toBe('FAIR');
      expect(Condition.POOR).toBe('POOR');
    });
  });
});