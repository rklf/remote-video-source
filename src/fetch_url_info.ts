export default async (url: string): Promise<{ fileSize: number, contentType: string }> => {
    if (!url) {
      throw new Error("Invalid Url");
    }
  
    try {
      // Use fetch with HEAD method to get the content-length and content-type headers
      const response = await fetch(url, { method: "HEAD" });
  
      if (response.ok) {
        const contentLength = response.headers.get("content-length");
        const contentType = response.headers.get("content-type");
        if (contentLength && contentType) {
          return { fileSize: parseInt(contentLength, 10), contentType }
        } else {
          throw new Error("Couldn't get file size (no content-length header)");
        }
      } else {
        throw new Error(`Couldn't get file size (HTTP status ${response.status})`);
      }
    } catch (error) {
      throw new Error(`Couldn't get file size (fetch): ${error.message}`);
    }
  };
  