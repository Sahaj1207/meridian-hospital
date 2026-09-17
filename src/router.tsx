import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/shared/Layout';
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { FindCarePage } from '@/pages/FindCarePage';
import { SpecialistsPage } from '@/pages/SpecialistsPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { JournalPage } from '@/pages/JournalPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { AppointmentPage } from '@/pages/AppointmentPage';
import { InternationalPatientsPage } from '@/pages/InternationalPatientsPage';
import { InsuranceBillingPage } from '@/pages/InsuranceBillingPage';
import { AdminAnalyticsPage } from '@/pages/AdminAnalyticsPage';
import { RouteErrorView } from '@/components/shared/RouteErrorView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorView />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'about',
        element: <AboutPage />
      },
      {
        path: 'find-care',
        element: <FindCarePage />
      },
      {
        path: 'specialists',
        element: <SpecialistsPage />
      },
      {
        path: 'departments',
        element: <DepartmentsPage />
      },
      {
        path: 'patients',
        element: <PatientsPage />
      },
      {
        path: 'journal',
        element: <JournalPage />
      },
      {
        path: 'locations',
        element: <LocationsPage />
      },
      {
        path: 'appointment',
        element: <AppointmentPage />
      },
      {
        path: 'international-patients',
        element: <InternationalPatientsPage />
      },
      {
        path: 'insurance-billing',
        element: <InsuranceBillingPage />
      },
      {
        path: 'admin',
        element: <AdminAnalyticsPage />
      },
      {
        path: '*',
        element: <RouteErrorView is404 />
      }
    ]
  }
]);
