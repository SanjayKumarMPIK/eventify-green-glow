
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

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
  event_title?: string;
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

export function EventFeedbackList() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [currentEventId, setCurrentEventId] = useState<string | "all">("all");
  const [events, setEvents] = useState<{id: string, title: string}[]>([]);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      try {
        // First fetch all events to populate the filter
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, title')
          .order('title', { ascending: true });
          
        if (eventsError) throw eventsError;
        setEvents(eventsData);
        
        // Fetch all feedback entries
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Get user names for the feedback entries
        const userIds = data.map(f => f.user_id);
        
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
          
        if (usersError) throw usersError;
        
        // Get event titles
        const eventIds = data.map(f => f.event_id);
        
        const { data: eventDetails, error: eventError } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
          
        if (eventError) throw eventError;
        
        // Create maps for quicker lookups
        const usersMap = users.reduce((acc, user) => {
          acc[user.id] = user.name;
          return acc;
        }, {} as Record<string, string>);
        
        const eventsMap = eventDetails.reduce((acc, event) => {
          acc[event.id] = event.title;
          return acc;
        }, {} as Record<string, string>);
        
        // Add user names and event titles to feedback
        const feedbackWithDetails = data.map(f => ({
          ...f,
          user_name: usersMap[f.user_id] || 'Unknown User',
          event_title: eventsMap[f.event_id] || 'Unknown Event'
        }));
        
        setFeedbacks(feedbackWithDetails);
        
        // Calculate summary data
        calculateSummary(feedbackWithDetails);
      } catch (error) {
        console.error("Error fetching feedback:", error);
        toast.error("Failed to load feedback data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    // Filter feedbacks by current event if needed
    const filteredFeedbacks = currentEventId === "all" 
      ? feedbacks 
      : feedbacks.filter(f => f.event_id === currentEventId);
      
    // Recalculate summary for filtered feedbacks
    calculateSummary(filteredFeedbacks);
  }, [currentEventId, feedbacks]);

  const calculateSummary = (feedbackList: Feedback[]) => {
    if (feedbackList.length > 0) {
      const totalRating = feedbackList.reduce((sum, f) => sum + f.overall_rating, 0);
      const informativeCount = feedbackList.filter(f => f.was_informative).length;
      
      const orgRatings = feedbackList.reduce((counts, f) => {
        counts[f.organization_rating]++;
        return counts;
      }, {
        Excellent: 0,
        Good: 0,
        Average: 0,
        Poor: 0
      });
      
      setSummary({
        totalResponses: feedbackList.length,
        averageRating: totalRating / feedbackList.length,
        informativeCount,
        organizationRatings: orgRatings
      });
    } else {
      setSummary({
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
    }
  };

  const generateRatingData = () => {
    const feedbackList = currentEventId === "all" 
      ? feedbacks 
      : feedbacks.filter(f => f.event_id === currentEventId);
      
    return [
      { name: '1 ★', count: feedbackList.filter(f => f.overall_rating === 1).length },
      { name: '2 ★', count: feedbackList.filter(f => f.overall_rating === 2).length },
      { name: '3 ★', count: feedbackList.filter(f => f.overall_rating === 3).length },
      { name: '4 ★', count: feedbackList.filter(f => f.overall_rating === 4).length },
      { name: '5 ★', count: feedbackList.filter(f => f.overall_rating === 5).length },
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

  const getFilteredFeedbacks = () => {
    return currentEventId === "all"
      ? feedbacks
      : feedbacks.filter(f => f.event_id === currentEventId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Feedback Analysis</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Filter by event:</span>
          <select 
            className="border rounded p-1 text-sm"
            value={currentEventId}
            onChange={(e) => setCurrentEventId(e.target.value)}
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.totalResponses}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {currentEventId === "all" ? "all events" : "this event"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.totalResponses > 0 ? summary.averageRating.toFixed(1) : "N/A"} 
                      <span className="text-lg"> / 5</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Overall satisfaction score
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Found Informative</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.totalResponses > 0 ? 
                        `${Math.round((summary.informativeCount / summary.totalResponses) * 100)}%` : 
                        "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.informativeCount} of {summary.totalResponses} responses
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Organization Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Excellent:</span>
                        <Badge variant="outline" className="ml-2 bg-green-50">
                          {summary.organizationRatings.Excellent} 
                          {summary.totalResponses > 0 ? 
                            ` (${Math.round((summary.organizationRatings.Excellent / summary.totalResponses) * 100)}%)` : 
                            ""}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Good:</span>
                        <Badge variant="outline" className="ml-2 bg-blue-50">
                          {summary.organizationRatings.Good}
                          {summary.totalResponses > 0 ? 
                            ` (${Math.round((summary.organizationRatings.Good / summary.totalResponses) * 100)}%)` : 
                            ""}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Average:</span>
                        <Badge variant="outline" className="ml-2 bg-yellow-50">
                          {summary.organizationRatings.Average}
                          {summary.totalResponses > 0 ? 
                            ` (${Math.round((summary.organizationRatings.Average / summary.totalResponses) * 100)}%)` : 
                            ""}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Poor:</span>
                        <Badge variant="outline" className="ml-2 bg-red-50">
                          {summary.organizationRatings.Poor}
                          {summary.totalResponses > 0 ? 
                            ` (${Math.round((summary.organizationRatings.Poor / summary.totalResponses) * 100)}%)` : 
                            ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="comments">
              <Card>
                <CardHeader>
                  <CardTitle>User Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {getFilteredFeedbacks()
                        .filter(f => f.additional_comments && f.additional_comments.trim() !== '')
                        .map(f => (
                          <div key={f.id} className="border p-3 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <span className="font-medium">{f.user_name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  on "{f.event_title}"
                                </span>
                              </div>
                              <Badge variant="outline">{f.overall_rating} ★</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{f.additional_comments}</p>
                          </div>
                        ))}
                      
                      {getFilteredFeedbacks().filter(f => f.additional_comments && f.additional_comments.trim() !== '').length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No comments provided yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="charts">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.totalResponses > 0 ? (
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
                
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Ratings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.totalResponses > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={generateOrganizationData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
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
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
