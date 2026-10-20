import { Component } from 'react'
import { StateBlock } from './StateBlock.jsx'

/** Keep a failing data-driven section from taking down the application shell. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <StateBlock variant="error" title="This section could not be displayed"
          message="Please try again. If this continues, reload the page."
          onRetry={() => this.setState({ failed: false })} />
      )
    }
    return this.props.children
  }
}
