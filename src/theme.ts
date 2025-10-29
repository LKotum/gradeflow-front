import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a"
    }
  },
  styles: {
    global: (props: { colorMode: "light" | "dark" }) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
        color: props.colorMode === "dark" ? "gray.100" : "gray.800",
        transition: "background-color 0.3s ease, color 0.3s ease"
      }
    })
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "brand"
      }
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: "xl"
        }
      }
    },
    Card: {
      baseStyle: {
        container: {
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          _hover: {
            transform: "translateY(-4px)",
            boxShadow: "lg"
          }
        }
      }
    }
  }
});

export default theme;
