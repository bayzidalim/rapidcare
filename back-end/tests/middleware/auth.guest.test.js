const { expect } = require('chai');
const sinon = require('sinon');
const { optionalAuth, requireAuth } = require('../../middleware/auth');
const UserService = require('../../services/userService');

describe('Guest Authentication Middleware', () => {
  let req, res, next, userServiceStub;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    next = sinon.stub();
    userServiceStub = sinon.stub(UserService, 'verifyToken');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('optionalAuth middleware', () => {
    it('should set isGuest to true when no authorization header is provided', () => {
      optionalAuth(req, res, next);

      expect(req.isGuest).to.be.true;
      expect(req.user).to.be.undefined;
      expect(next.calledOnce).to.be.true;
    });

    it('should set isGuest to true when authorization header is malformed', () => {
      req.headers.authorization = 'InvalidHeader';

      optionalAuth(req, res, next);

      expect(req.isGuest).to.be.true;
      expect(req.user).to.be.undefined;
      expect(next.calledOnce).to.be.true;
    });

    it('should set user and isGuest to false when valid token is provided', () => {
      const mockUser = { id: 1, username: 'testuser', userType: 'user' };
      const mockDecoded = { userId: 1 };
      
      req.headers.authorization = 'Bearer validtoken';
      userServiceStub.returns(mockDecoded);
      sinon.stub(UserService, 'getById').returns(mockUser);

      optionalAuth(req, res, next);

      expect(req.user).to.deep.equal(mockUser);
      expect(req.isGuest).to.be.false;
      expect(next.calledOnce).to.be.true;
    });

    it('should set isGuest to true when token is invalid', () => {
      req.headers.authorization = 'Bearer invalidtoken';
      userServiceStub.throws(new Error('Invalid token'));

      optionalAuth(req, res, next);

      expect(req.isGuest).to.be.true;
      expect(req.user).to.be.undefined;
      expect(next.calledOnce).to.be.true;
    });

    it('should set isGuest to true when user is not found in database', () => {
      const mockDecoded = { userId: 999 };
      
      req.headers.authorization = 'Bearer validtoken';
      userServiceStub.returns(mockDecoded);
      sinon.stub(UserService, 'getById').returns(null);

      optionalAuth(req, res, next);

      expect(req.isGuest).to.be.true;
      expect(req.user).to.be.undefined;
      expect(next.calledOnce).to.be.true;
    });

    it('should handle both userId and id in decoded token', () => {
      const mockUser = { id: 1, username: 'testuser', userType: 'user' };
      const mockDecoded = { id: 1 }; // Using 'id' instead of 'userId'
      
      req.headers.authorization = 'Bearer validtoken';
      userServiceStub.returns(mockDecoded);
      sinon.stub(UserService, 'getById').returns(mockUser);

      optionalAuth(req, res, next);

      expect(req.user).to.deep.equal(mockUser);
      expect(req.isGuest).to.be.false;
      expect(next.calledOnce).to.be.true;
    });
  });

  describe('requireAuth middleware', () => {
    it('should return 401 when no authorization header is provided', () => {
      requireAuth(req, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        error: 'Access token required'
      })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 401 when authorization header is malformed', () => {
      req.headers.authorization = 'InvalidHeader';

      requireAuth(req, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        error: 'Access token required'
      })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should set user and continue when valid token is provided', () => {
      const mockUser = { id: 1, username: 'testuser', userType: 'user' };
      const mockDecoded = { userId: 1 };
      
      req.headers.authorization = 'Bearer validtoken';
      userServiceStub.returns(mockDecoded);
      sinon.stub(UserService, 'getById').returns(mockUser);

      requireAuth(req, res, next);

      expect(req.user).to.deep.equal(mockUser);
      expect(req.isGuest).to.be.false;
      expect(next.calledOnce).to.be.true;
    });

    it('should return 401 when token is invalid', () => {
      req.headers.authorization = 'Bearer invalidtoken';
      userServiceStub.throws(new Error('Invalid token'));

      requireAuth(req, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        error: 'Invalid token'
      })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 401 when user is not found in database', () => {
      const mockDecoded = { userId: 999 };
      
      req.headers.authorization = 'Bearer validtoken';
      userServiceStub.returns(mockDecoded);
      sinon.stub(UserService, 'getById').returns(null);

      requireAuth(req, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        error: 'User not found'
      })).to.be.true;
      expect(next.called).to.be.false;
    });
  });
});