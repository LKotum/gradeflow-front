import { Box, type BoxProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface ResponsiveTableContainerProps extends BoxProps {
  children: ReactNode;
}

/**
 * Wraps tables with horizontal scrolling and hides scrollbars on touch devices.
 * Prevents layout breaking on smaller screens while keeping native Table markup.
 */
const ResponsiveTableContainer = ({
  children,
  ...rest
}: ResponsiveTableContainerProps) => (
  <Box
    overflowX="auto"
    w="full"
    px={{ base: 2, md: 0 }}
    sx={{
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default ResponsiveTableContainer;
