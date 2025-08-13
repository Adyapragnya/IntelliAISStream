import {
  MapPinIcon,
  RectangleStackIcon,
  HomeIcon,
  UserCircleIcon,
  TableCellsIcon,
  InformationCircleIcon,
  ServerStackIcon,
  // RectangleStackIcon,
} from "@heroicons/react/24/solid";
import {  DrawAOI,Marine, Profile, Tables, Notifications } from "@/pages/dashboard";
import { SignIn, SignUp } from "@/pages/auth";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    pages: [
      {
         icon: <MapPinIcon {...icon} />,
        name: "Maritime",
        path: "/home",
        // element: <Home />,
        element: <Marine />, // Changed to DrawAOI component
      },
        {
        icon: <RectangleStackIcon {...icon} />,
        name: "Draw AOI",
        path: "/draw-aoi",
        // element: <Home />,
        element: <DrawAOI />, // Changed to DrawAOI component
      },
      // {
      //   icon: <UserCircleIcon {...icon} />,
      //   name: "profile",
      //   path: "/profile",
      //   element: <Profile />,
      // },
      // {
      //   icon: <TableCellsIcon {...icon} />,
      //   name: "tables",
      //   path: "/tables",
      //   element: <Tables />,
      // },
      // {
      //   icon: <InformationCircleIcon {...icon} />,
      //   name: "notifications",
      //   path: "/notifications",
      //   element: <Notifications />,
      // },
    ],
  },
  {
    title: "auth pages",
    layout: "auth",
    pages: [
      {
        icon: <ServerStackIcon {...icon} />,
        name: "sign in",
        path: "/sign-in",
        element: <SignIn />,
        sidebar: false, 
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "sign up",
        path: "/sign-up",
        element: <SignUp />,
        sidebar: false, 
      },
    ],
  },
];

export default routes;


