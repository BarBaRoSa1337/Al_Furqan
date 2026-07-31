// Mock image extensions for Node execution
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.jpg'] = () => 'mock-image.jpg';
  require.extensions['.png'] = () => 'mock-image.png';
}
