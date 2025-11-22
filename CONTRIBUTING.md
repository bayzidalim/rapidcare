# 🤝 Contributing to RapidCare

Thank you for your interest in contributing to RapidCare! This document provides guidelines and information for contributors.

## 🌟 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, Node.js version)

### Suggesting Features

1. **Open a feature request** using the appropriate template
2. **Describe the problem** your feature would solve
3. **Explain your proposed solution** in detail
4. **Consider alternatives** and mention them

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

## 📝 Coding Standards

### General Guidelines

- **Write clean, readable code** with meaningful variable names
- **Follow existing code style** and patterns
- **Add comments** for complex logic
- **Keep functions small** and focused on single responsibilities
- **Use TypeScript** for type safety where applicable

### Backend Standards

- **Use Express.js patterns** consistently
- **Implement proper error handling** with try-catch blocks
- **Validate input data** using middleware
- **Follow RESTful API conventions**
- **Write unit tests** for services and controllers

### Frontend Standards

- **Use React functional components** with hooks
- **Implement proper TypeScript types**
- **Follow Next.js conventions** for routing and data fetching
- **Use Tailwind CSS** for styling
- **Write component tests** using Jest and React Testing Library

### Database Standards

- **Use proper SQL practices** with parameterized queries
- **Implement database migrations** for schema changes
- **Add proper indexes** for performance
- **Follow naming conventions** (snake_case for database, camelCase for JavaScript)

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
```

### Writing Tests

- **Write unit tests** for all new functions and components
- **Include integration tests** for API endpoints
- **Test error scenarios** and edge cases
- **Maintain test coverage** above 80%
- **Use descriptive test names** that explain what is being tested

### Test Structure

```javascript
describe('Component/Function Name', () => {
  describe('when condition', () => {
    it('should do expected behavior', () => {
      // Test implementation
    });
  });
});
```

## 📚 Documentation

### Code Documentation

- **Add JSDoc comments** for functions and classes
- **Document complex algorithms** with inline comments
- **Update README files** when adding new features
- **Include usage examples** in documentation

### API Documentation

- **Update docs/API_UPDATED.md** when adding/modifying endpoints
- **Include request/response examples**
- **Document error codes** and messages
- **Add authentication requirements**

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

### PR Guidelines

- **Use descriptive titles** that explain the change
- **Fill out the PR template** completely
- **Link related issues** using keywords (fixes #123)
- **Keep PRs focused** on a single feature or fix
- **Request reviews** from relevant team members

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
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

### Examples

```bash
feat(auth): add JWT token refresh functionality
fix(booking): resolve date validation issue
docs(api): update authentication endpoints
test(hospital): add unit tests for hospital service
```

## 🌿 Branch Naming

Use descriptive branch names:

- `feature/add-payment-integration`
- `fix/booking-validation-error`
- `docs/update-api-documentation`
- `refactor/optimize-database-queries`

## 🔍 Code Review Guidelines

### For Reviewers

- **Be constructive** and respectful in feedback
- **Focus on code quality** and maintainability
- **Check for security issues** and best practices
- **Verify tests** cover new functionality
- **Ensure documentation** is updated

### For Authors

- **Respond promptly** to review feedback
- **Make requested changes** or explain why not
- **Keep discussions** focused on the code
- **Be open to suggestions** and learning opportunities

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

## 🆘 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Email**: urgent@rapidcare.com for urgent issues

### Resources

- [Project Documentation](./README.md)
- [API Documentation](./docs/API_UPDATED.md)
- [Deployment Guide](./docs/DEPLOYMENT_UPDATED.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)

## 🏆 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

## 📄 License

By contributing to RapidCare, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to RapidCare and helping us provide better emergency medical services! 🚑