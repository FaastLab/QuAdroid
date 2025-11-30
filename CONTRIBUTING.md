# Contributing to TestPilot Core

Thank you for considering contributing to TestPilot Core! 🎉

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly** - ensure tests pass and no regressions
5. **Commit with clear messages** (`git commit -m 'Add amazing feature'`)
6. **Push to your fork** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

## Development Setup

See [README.md](README.md) for installation instructions.

## Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and small

## Testing

Before submitting:
```bash
# Test web-crawler worker
cd apps/workers/web-crawler
npm test

# Test user-journey worker
cd apps/workers/user-journey
npm test
```

## Reporting Issues

- Check existing issues first
- Provide clear reproduction steps
- Include error logs and screenshots
- Mention your environment (OS, Node version, etc.)

## Feature Requests

We welcome new ideas! Open an issue with:
- Clear description of the feature
- Use case / problem it solves
- Possible implementation approach

## Questions?

- Open a [Discussion](https://github.com/yourusername/testpilot-core/discussions)
- Or reach out via [Issues](https://github.com/yourusername/testpilot-core/issues)

---

**By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.**


