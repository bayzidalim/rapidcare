# 🤝 Contributing to RapidCare

Thank you for your interest in contributing to RapidCare! This document provides guidelines and information for contributors to help maintain the quality and consistency of our emergency medical resource booking platform.

## 🌟 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, Node.js version)
   - User role and permissions (if relevant)

### Suggesting Features

1. **Open a feature request** using the appropriate template
2. **Describe the problem** your feature would solve
3. **Explain your proposed solution** in detail
4. **Consider alternatives** and mention them
5. **Specify which user roles** would benefit from the feature

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** from `main`
3. **Make your changes** following our coding standards
4. **Write tests** for new functionality
5. **Update documentation** as needed
6. **Submit a pull request**

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm 8+
- Git
- SQLite (included with Node.js)

### Setup Steps

1. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/rapidcare.git
   cd rapidcare
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   # Backend
   cp back-end/.env.example back-end/.env
   
   # Frontend  
   cp front-end/.env.example front-end/.env.local
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

### Database Setup

1. **Run migrations:**
   ```bash
   cd back-end
   npm run migrate
   ```

2. **Seed database (optional):**
   ```bash
   npm run seed
   npm run seed:financial  # For financial test data
   ```

## 📝 Coding Standards

### General Guidelines

- **Write clean, readable code** with meaningful variable names
- **Follow existing code style** and patterns
- **Add comments** for complex logic
- **Keep functions small** and focused on single responsibilities
- **Use TypeScript** for type safety where applicable
- **Implement proper error handling** with try-catch blocks
- **Log appropriately** for debugging and monitoring

### Backend Standards

- **Use Express.js patterns** consistently
- **Implement proper error handling** with centralized error middleware
- **Validate input data** using middleware and service validation
- **Follow RESTful API conventions** with proper HTTP status codes
- **Write unit tests** for services and controllers
- **Use database transactions** for operations that modify multiple tables
- **Implement role-based access control** for protected endpoints
- **Secure financial operations** with additional authentication layers
- **Log audit trails** for sensitive operations

### Frontend Standards

- **Use React functional components** with hooks
- **Implement proper TypeScript types** for all components and utilities
- **Follow Next.js conventions** for routing and data fetching
- **Use Tailwind CSS** for styling with consistent design tokens
- **Write component tests** using Jest and React Testing Library
- **Implement proper error boundaries** for graceful error handling
- **Use React Context** for state management where appropriate
- **Implement proper loading states** for API calls
- **Follow accessibility guidelines** (WCAG 2.1 AA)

### Database Standards

- **Use proper SQL practices** with parameterized queries to prevent injection
- **Implement database migrations** for schema changes
- **Add proper indexes** for performance on frequently queried columns
- **Follow naming conventions** (snake_case for database, camelCase for JavaScript)
- **Use foreign key constraints** to maintain referential integrity
- **Implement soft deletes** where appropriate
- **Add audit columns** (created_at, updated_at) to all tables
- **Use transactions** for operations that span multiple tables

### API Standards

- **Use consistent response formats** with success, data, and message fields
- **Implement proper HTTP status codes** (200, 201, 400, 401, 403, 404, 500)
- **Provide meaningful error messages** without exposing sensitive information
- **Implement rate limiting** to prevent abuse
- **Use proper authentication middleware** for protected endpoints
- **Validate request payloads** with Zod schemas
- **Document all endpoints** in the API documentation
- **Version APIs** when making breaking changes

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Backend tests only
cd back-end && npm test

# Frontend tests only  
cd front-end && npm test

# Watch mode for development
cd front-end && npm run test:watch

# Financial tests (important for payment features)
cd back-end && npm run test:financial

# bKash integration tests
cd back-end && npm run test:bkash

# Run tests with coverage
cd back-end && npm run test:coverage
cd front-end && npm run test:coverage
```

### Writing Tests

- **Write unit tests** for all new functions and components
- **Include integration tests** for API endpoints
- **Test error scenarios** and edge cases
- **Maintain test coverage** above 80%
- **Use descriptive test names** that explain what is being tested
- **Mock external dependencies** (API calls, database, etc.)
- **Test role-based access control** for protected endpoints
- **Test financial operations** thoroughly with various scenarios
- **Test real-time features** with polling mechanisms

### Test Structure

```javascript
describe('Component/Function Name', () => {
  describe('when condition', () => {
    it('should do expected behavior', () => {
      // Test implementation
    });
  });
  
  describe('when error condition', () => {
    it('should handle error gracefully', () => {
      // Error test implementation
    });
  });
});
```

### Test Data Management

- **Use factories** for creating test data
- **Clean up test data** after each test
- **Use separate test databases** when possible
- **Seed consistent test data** for reproducible tests
- **Test with edge cases** (empty data, large datasets, etc.)

## 📚 Documentation

### Code Documentation

- **Add JSDoc comments** for functions and classes
- **Document complex algorithms** with inline comments
- **Update README files** when adding new features
- **Include usage examples** in documentation
- **Document environment variables** and configuration options

### API Documentation

- **Update API_UPDATED.md** when adding/modifying endpoints
- **Include request/response examples** for all endpoints
- **Document error codes** and messages
- **Add authentication requirements** for each endpoint
- **Specify rate limits** for endpoints
- **Document query parameters** and body fields

### Feature Documentation

- **Document new features** in the appropriate README files
- **Update user guides** when UI changes are made
- **Add architectural diagrams** for complex features
- **Document deployment considerations** for new services

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure all tests pass:**
   ```bash
   npm test
   ```

2. **Run linting:**
   ```bash
   npm run lint
   ```

3. **Build successfully:**
   ```bash
   npm run build
   ```

4. **Update documentation** if needed

5. **Check code coverage** meets requirements

### PR Guidelines

- **Use descriptive titles** that explain the change
- **Fill out the PR template** completely
- **Link related issues** using keywords (fixes #123)
- **Keep PRs focused** on a single feature or fix
- **Request reviews** from relevant team members
- **Include screenshots** for UI changes
- **Add test cases** for new functionality
- **Update CHANGELOG.md** with user-facing changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Cross-browser testing (if UI change)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests cover edge cases
- [ ] Performance impact assessed
- [ ] Security considerations addressed

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Fixes #123
Related to #456
```

## 🏷️ Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `security`: Security fixes
- `revert`: Reverting previous changes

### Scopes

- `auth`: Authentication system
- `booking`: Hospital booking system
- `payment`: Payment processing
- `blood`: Blood donation system
- `sample`: Home sample collection system
- `admin`: Admin dashboard
- `api`: API endpoints
- `db`: Database changes
- `ui`: User interface
- `docs`: Documentation
- `test`: Testing infrastructure
- `deploy`: Deployment configuration

### Examples

```bash
feat(sample): add home sample collection service
fix(payment): resolve bKash callback verification issue
docs(api): update sample collection endpoint documentation
test(booking): add unit tests for booking service
refactor(auth): improve JWT token refresh mechanism
security(db): add input sanitization for hospital data
```

## 🌿 Branch Naming

Use descriptive branch names:

- `feature/add-payment-integration`
- `fix/booking-validation-error`
- `docs/update-api-documentation`
- `refactor/optimize-database-queries`
- `security/fix-auth-vulnerability`
- `feature/sample-collection-workflow`

## 🔍 Code Review Guidelines

### For Reviewers

- **Be constructive** and respectful in feedback
- **Focus on code quality** and maintainability
- **Check for security issues** and best practices
- **Verify tests** cover new functionality
- **Ensure documentation** is updated
- **Check for performance implications**
- **Review error handling** completeness
- **Validate API design** consistency

### For Authors

- **Respond promptly** to review feedback
- **Make requested changes** or explain why not
- **Keep discussions** focused on the code
- **Be open to suggestions** and learning opportunities
- **Address all comments** before merging
- **Test reviewer suggestions** when applicable

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version** in package.json files
2. **Update CHANGELOG.md** with new features and fixes
3. **Create release tag** with version number
4. **Deploy to production** environments
5. **Announce release** to stakeholders
6. **Monitor production** for issues

### Pre-release Checklist

- [ ] All feature branches merged
- [ ] Final testing completed
- [ ] Documentation updated
- [ ] Security audit performed
- [ ] Performance benchmarks verified
- [ ] Deployment procedures tested

## 🛡️ Security Considerations

### Code Security

- **Validate all user inputs** to prevent injection attacks
- **Sanitize output** to prevent XSS attacks
- **Use parameterized queries** to prevent SQL injection
- **Implement proper authentication** for all protected endpoints
- **Store secrets securely** using environment variables
- **Encrypt sensitive data** at rest and in transit
- **Implement rate limiting** to prevent abuse
- **Log security events** for monitoring

### Financial Security

- **Secure payment data** with encryption
- **Validate payment amounts** to prevent manipulation
- **Implement fraud detection** mechanisms
- **Audit all financial transactions** with detailed logs
- **Use secure payment gateways** with proper authentication
- **Implement reconciliation** processes for financial accuracy
- **Protect against double-charging** scenarios

### Data Privacy

- **Comply with data protection regulations** (GDPR, etc.)
- **Implement data retention policies**
- **Provide data export/deletion mechanisms**
- **Minimize data collection** to necessary information only
- **Encrypt personal data** in the database
- **Implement proper access controls** for sensitive data

## 📈 Performance Guidelines

### Backend Performance

- **Optimize database queries** with proper indexing
- **Use connection pooling** for database connections
- **Implement caching** for frequently accessed data
- **Limit result sets** with pagination
- **Use efficient algorithms** for data processing
- **Monitor memory usage** to prevent leaks
- **Optimize polling intervals** for real-time updates

### Frontend Performance

- **Optimize bundle size** by code splitting
- **Implement lazy loading** for non-critical components
- **Use efficient rendering** techniques (memoization, etc.)
- **Optimize images** and static assets
- **Minimize API calls** with caching strategies
- **Implement proper loading states** for better UX
- **Use web workers** for heavy computations

## 🆘 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Email**: support@rapidcare.com for urgent issues
- **Slack/Discord**: Real-time community support (if available)

### Resources

- [Project Documentation](./README_UPDATED.md)
- [API Documentation](./docs/API_UPDATED.md)
- [Deployment Guide](./docs/DEPLOYMENT_UPDATED.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://reactjs.org/docs/getting-started.html)

## 🏆 Recognition

Contributors will be recognized in:

- **README_UPDATED.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page
- **Community spotlight** (if applicable)

## 📄 License

By contributing to RapidCare, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to RapidCare and helping us provide better emergency medical services! 🚑