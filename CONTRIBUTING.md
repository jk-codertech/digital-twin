# Contributing to Digital Twin Counter

Thank you for your interest in contributing to Digital Twin Counter! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and professional in all interactions. We welcome contributions from developers of all experience levels.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/digital-twin.git
   cd digital-twin
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   Follow the prompts to set up your Convex deployment.

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing code patterns and architecture
- Use meaningful variable and function names
- Write clean, self-documenting code

### Testing Concurrency
When working on features that affect multiple users:
1. Test with multiple browser tabs/windows
2. Test rapid clicking/interactions
3. Verify atomic operations work correctly
4. Check for race conditions

### Architecture Principles
- **SOLID Principles**: Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion
- **DRY**: Don't Repeat Yourself
- **Component Separation**: Keep components focused and reusable
- **Type Safety**: Use TypeScript interfaces and types throughout

## Submitting Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, well-documented code
   - Test your changes thoroughly
   - Ensure the build passes: `npm run build`

3. **Commit Your Changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code refactoring
   - `test:` for adding tests

4. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request through GitHub.

## Pull Request Guidelines

- Provide a clear description of the changes
- Include screenshots for UI changes
- Reference any related issues
- Ensure CI/CD pipeline passes
- Test concurrency scenarios if applicable

## Areas for Contribution

- **UI/UX Improvements**: Better design, animations, accessibility
- **Performance Optimizations**: Faster load times, reduced bundle size
- **New Features**: Additional counter operations, user management
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: Code comments, tutorials, examples
- **Accessibility**: Screen reader support, keyboard navigation
- **Internationalization**: Multi-language support

## Questions?

Feel free to open an issue for questions or discussions about potential contributions.

Thank you for contributing to Digital Twin Counter!
