import { Component } from 'react';

/**
 * A cover that throws (a bad import, a missing picture, a shader that does not
 * link) must not take the gallery down. This boundary replaces that one
 * route's Canvas with DOM copy; the panel and the link back keep working.
 *
 * Error boundaries are still class components in React 19.
 */
export default class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`covers/${this.props.slug}:`, error);
  }

  render() {
    if (this.state.error) {
      if (this.props.slug === '_fixture-throw') {
        return (
          <main className="canvas-error canvas-error--fixture" role="alert">
            <p className="eyebrow">Instructor regression fixture</p>
            <h1>This route fails on purpose</h1>
            <p>
              <code>/covers/_fixture-throw</code> deliberately throws while React renders. It proves
              that one student route can fail without taking down the shared class exhibition.
            </p>
            <p>
              The error boundary has replaced only this route. The project selector, previous/next
              links, and <strong>All projects</strong> navigation remain outside the boundary and
              should still work.
            </p>
            <h2>What this fixture checks</h2>
            <ul>
              <li>A missing import, image, invalid component, or shader failure stays local.</li>
              <li>The failing route reports its slug and error in the browser console.</li>
              <li>Visitors can leave the route without refreshing the page.</li>
              <li>Other student endpoints continue to load normally.</li>
            </ul>
            <p className="meta">
              Expected error: <code>{String(this.state.error.message ?? this.state.error)}</code>
            </p>
            <p className="meta">
              This is infrastructure evidence, not a broken student submission. Keep the direct URL
              for testing after changes to routing, lazy loading, navigation, or error handling.
            </p>
          </main>
        );
      }

      return (
        <div className="canvas-error" role="alert">
          <p>
            This cover could not render: <code>{String(this.state.error.message ?? this.state.error)}</code>
          </p>
          <p className="meta">
            Check the browser console, then <code>covers/{this.props.slug}/src/</code>.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
