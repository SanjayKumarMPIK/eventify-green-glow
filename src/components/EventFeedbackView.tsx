
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Event } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Feedback {
  id: string;
  event_id: string;
  user_id: string;
  overall_rating: number;
  was_informative: boolean;
  organization_rating: string;
  additional_comments?: string;
  created_at: string;
  user_name?: string;
}

interface FeedbackSummary {
  totalResponses: number;
  averageRating: number;
  informativeCount: number;
  organizationRatings: {
    Excellent: number;
    Good: number;
    Average: number;
    Poor: number;
  };
}

interface EventFeedbackViewProps {
  event: Event;
}

export function EventFeedbackView({ event }: EventFeedbackViewProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    totalResponses: 0,
    averageRating: 0,
    informativeCount: 0,
    organizationRatings: {
      Excellent: 0,
      Good: 0,
      Average: 0,
      Poor: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .eq('event_id', event.id);
          
        if (error) throw error;
        
        // Get user names for the feedback entries
        const userIds = data.map(f => f.user_id);
        
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
          
        if (usersError) throw usersError;
        
        const usersMap = users.reduce((acc, user) => {
          acc[user.id] = user.name;
          return acc;
        }, {} as Record<string, string>);
        
        // Add user names to feedback
        const feedbackWithNames = data.map(f => ({
          ...f,
          user_name: usersMap[f.user_id] || 'Unknown User'
        }));
        
        setFeedback(feedbackWithNames);
        
        // Calculate summary data
        if (feedbackWithNames.length > 0) {
          const totalRating = feedbackWithNames.reduce((sum, f) => sum + f.overall_rating, 0);
          const informativeCount = feedbackWithNames.filter(f => f.was_informative).length;
          
          const orgRatings = feedbackWithNames.reduce((counts, f) => {
            counts[f.organization_rating]++;
            return counts;
          }, {
            Excellent: 0,
            Good: 0,
            Average: 0,
            Poor: 0
          });
          
          setSummary({
            totalResponses: feedbackWithNames.length,
            averageRating: totalRating / feedbackWithNames.length,
            informativeCount,
            organizationRatings: orgRatings
          });
        }
      } catch (error) {
        console.error("Error fetching feedback:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedback();
  }, [event.id]);

  const generateRatingData = () => {
    return [
      { name: '1 ★', count: feedback.filter(f => f.overall_rating === 1).length },
      { name: '2 ★', count: feedback.filter(f => f.overall_rating === 2).length },
      { name: '3 ★', count: feedback.filter(f => f.overall_rating === 3).length },
      { name: '4 ★', count: feedback.filter(f => f.overall_rating === 4).length },
      { name: '5 ★', count: feedback.filter(f => f.overall_rating === 5).length },
    ];
  };

  const generateOrganizationData = () => {
    return [
      { name: 'Excellent', value: summary.organizationRatings.Excellent },
      { name: 'Good', value: summary.organizationRatings.Good },
      { name: 'Average', value: summary.organizationRatings.Average },
      { name: 'Poor', value: summary.organizationRatings.Poor },
    ];
  };

  const COLORS = ['#10b981', '#60a5fa', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Summary Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
            <CardDescription>
              Overview of all feedback received for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : feedback.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Responses:</span>
                  <Badge variant="outline">{summary.totalResponses}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Rating:</span>
                  <Badge variant="outline">{summary.averageRating.toFixed(1)} / 5</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Found Informative:</span>
                  <Badge variant="outline">{summary.informativeCount} ({Math.round((summary.informativeCount / summary.totalResponses) * 100)}%)</Badge>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No feedback received yet</p>
            )}
          </CardContent>
        </Card>
        
        {/* Rating Distribution Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : feedback.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={generateRatingData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data to display</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Organization Ratings Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Organization Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : feedback.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={generateOrganizationData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {generateOrganizationData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data to display</p>
            )}
          </CardContent>
        </Card>
        
        {/* Comments */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>User Comments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : feedback.length > 0 ? (
              <ScrollArea className="h-64 pr-4">
                <div className="space-y-4">
                  {feedback
                    .filter(f => f.additional_comments && f.additional_comments.trim() !== '')
                    .map(f => (
                      <div key={f.id} className="border p-3 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{f.user_name}</span>
                          <Badge variant="outline">{f.overall_rating} ★</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{f.additional_comments}</p>
                      </div>
                    ))}
                  
                  {feedback.filter(f => f.additional_comments && f.additional_comments.trim() !== '').length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No comments provided yet</p>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-4">No feedback received yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
